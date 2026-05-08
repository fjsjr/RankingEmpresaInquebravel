-- ============================================
-- Ranking Empresa Inquebrável — Schema Inicial
-- ============================================

-- Grupos/Times
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participantes
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pontuações
CREATE TABLE IF NOT EXISTS scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT,
  type VARCHAR(10) DEFAULT 'manual' CHECK (type IN ('manual', 'ai')),
  ai_analysis JSONB,
  created_by VARCHAR(100) DEFAULT 'Admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_participants_group ON participants(group_id);
CREATE INDEX IF NOT EXISTS idx_scores_group ON scores(group_id);
CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at DESC);

-- View de Ranking
CREATE OR REPLACE VIEW ranking AS
SELECT
  g.id,
  g.name,
  g.color,
  COALESCE(SUM(s.points), 0)::INTEGER AS total_points,
  COUNT(DISTINCT p.id)::INTEGER AS participant_count,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object('id', p.id, 'name', p.name)
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'
  ) AS participants,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(SUM(s.points), 0) DESC, g.created_at ASC
  )::INTEGER AS position
FROM groups g
LEFT JOIN scores s ON g.id = s.group_id
LEFT JOIN participants p ON g.id = p.group_id
GROUP BY g.id, g.name, g.color, g.created_at
ORDER BY total_points DESC;

-- Habilitar Realtime nas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;

-- RLS: desabilitar para uso com service_role no backend
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
