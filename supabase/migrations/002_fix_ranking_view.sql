-- Corrige a view ranking: o LEFT JOIN simultâneo em scores e participants
-- multiplicava SUM(points) pelo número de participantes do grupo.
-- Aplicada em produção em 2026-09-16.
CREATE OR REPLACE VIEW ranking AS
SELECT
  g.id,
  g.name,
  g.color,
  COALESCE(sc.total_points, 0)::INTEGER AS total_points,
  COALESCE(pa.participant_count, 0)::INTEGER AS participant_count,
  COALESCE(pa.participants, '[]'::json) AS participants,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(sc.total_points, 0) DESC, g.created_at ASC
  )::INTEGER AS position
FROM groups g
LEFT JOIN (
  SELECT group_id, SUM(points) AS total_points
  FROM scores
  GROUP BY group_id
) sc ON sc.group_id = g.id
LEFT JOIN (
  SELECT group_id,
         COUNT(*) AS participant_count,
         json_agg(json_build_object('id', id, 'name', name) ORDER BY name) AS participants
  FROM participants
  GROUP BY group_id
) pa ON pa.group_id = g.id
ORDER BY total_points DESC;
