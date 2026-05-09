import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
let aiAnalyzerModulePromise = null;

async function getAiAnalyzer() {
  if (!aiAnalyzerModulePromise) {
    aiAnalyzerModulePromise = import('../services/ai-analyzer.js');
  }
  return aiAnalyzerModulePromise;
}

// POST /api/scores/manual
router.post('/manual', requireAdmin, async (req, res) => {
  try {
    const { groupId, points, reason, createdBy } = req.body;

    if (!groupId || points === undefined) {
      return res.status(400).json({ error: 'groupId e points são obrigatórios' });
    }

    const parsedPoints = parseInt(points);
    if (isNaN(parsedPoints)) {
      return res.status(400).json({ error: 'points deve ser um número inteiro' });
    }

    const { data, error } = await supabaseAdmin
      .from('scores')
      .insert({
        group_id: groupId,
        points: parsedPoints,
        reason: reason?.trim() || 'Pontuação manual',
        type: 'manual',
        created_by: createdBy?.trim() || 'Admin',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scores/manual-batch — pontuação manual para múltiplos grupos de uma vez
router.post('/manual-batch', requireAdmin, async (req, res) => {
  try {
    const { groupIds, points, reason, createdBy } = req.body;

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ error: 'groupIds deve ser um array não vazio' });
    }
    const parsedPoints = parseInt(points);
    if (isNaN(parsedPoints)) {
      return res.status(400).json({ error: 'points deve ser um número inteiro' });
    }

    const rows = groupIds.map(groupId => ({
      group_id: groupId,
      points: parsedPoints,
      reason: reason?.trim() || 'Pontuação manual',
      type: 'manual',
      created_by: createdBy?.trim() || 'Admin',
    }));

    const { error } = await supabaseAdmin.from('scores').insert(rows);
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ success: true, saved: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scores/ai-rank-all — IA rankeia todos os grupos de uma vez
router.post('/ai-rank-all', requireAdmin, async (req, res) => {
  try {
    const { challenge, responses } = req.body;

    if (!challenge?.trim()) {
      return res.status(400).json({ error: 'challenge (desafio/pergunta) é obrigatório' });
    }
    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ error: 'responses deve ser um array com as respostas dos grupos' });
    }

    let result;
    try {
      const { rankAllGroups } = await getAiAnalyzer();
      result = await rankAllGroups({ challenge: challenge.trim(), responses });
    } catch (aiErr) {
      return res.status(502).json({ error: `Falha na análise da IA: ${aiErr.message}` });
    }

    res.json({ challenge, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scores/ai-confirm-all — salva pontuações de todos os grupos de uma vez
router.post('/ai-confirm-all', requireAdmin, async (req, res) => {
  try {
    const { challenge, ranking } = req.body;

    if (!Array.isArray(ranking) || ranking.length === 0) {
      return res.status(400).json({ error: 'ranking é obrigatório' });
    }

    const rows = ranking
      .filter(item => item.groupId)
      .map(item => ({
        group_id: item.groupId,
        points: parseInt(item.points) || 0,
        reason: challenge?.trim() || 'Análise por IA',
        type: 'ai',
        ai_analysis: { rank: item.rank, justification: item.justification },
        created_by: 'IA',
      }));

    const semId = ranking.filter(item => !item.groupId).map(item => item.groupName);
    if (semId.length > 0) {
      console.warn('[ai-confirm-all] Grupos sem groupId (não salvos):', semId);
    }

    if (!rows.length) {
      return res.status(400).json({ error: 'Nenhum grupo com ID válido encontrado. Verifique se os nomes retornados pela IA correspondem aos grupos cadastrados.' });
    }

    const { error } = await supabaseAdmin.from('scores').insert(rows);
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ success: true, saved: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scores/cin-rank-all — IA analisa CINs (PDFs) de todos os grupos
router.post('/cin-rank-all', requireAdmin, async (req, res) => {
  try {
    const { context, responses } = req.body;

    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ error: 'responses deve ser um array com os grupos e seus PDFs' });
    }

    const withPdf = responses.filter(r => r.pdfData);
    if (!withPdf.length) {
      return res.status(400).json({ error: 'Nenhum grupo enviou PDF do CIN' });
    }

    let result;
    try {
      const { rankCinGroups } = await getAiAnalyzer();
      result = await rankCinGroups({ context: context?.trim() || '', responses });
    } catch (aiErr) {
      return res.status(502).json({ error: `Falha na análise da IA: ${aiErr.message}` });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scores/plano-rank-all — IA analisa Planos de Ação (PDFs) de todos os grupos
router.post('/plano-rank-all', requireAdmin, async (req, res) => {
  try {
    const { context, responses } = req.body;

    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ error: 'responses deve ser um array com os grupos e seus PDFs' });
    }

    const withPdf = responses.filter(r => r.pdfData);
    if (!withPdf.length) {
      return res.status(400).json({ error: 'Nenhum grupo enviou PDF do Plano de Ação' });
    }

    let result;
    try {
      const { rankPlanosAcao } = await getAiAnalyzer();
      result = await rankPlanosAcao({ context: context?.trim() || '', responses });
    } catch (aiErr) {
      return res.status(502).json({ error: `Falha na análise da IA: ${aiErr.message}` });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scores/ai-analyze — análise individual (mantida)
router.post('/ai-analyze', requireAdmin, async (req, res) => {
  try {
    const { groupId, description, context } = req.body;

    if (!groupId || !description?.trim()) {
      return res.status(400).json({ error: 'groupId e description são obrigatórios' });
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    let analysis;
    try {
      const { analyzeActivity } = await getAiAnalyzer();
      analysis = await analyzeActivity({
        groupName: group.name,
        description: description.trim(),
        context: context?.trim(),
      });
    } catch (aiErr) {
      return res.status(502).json({ error: `Falha na análise da IA: ${aiErr.message}` });
    }

    res.json({ groupId, groupName: group.name, description, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scores/ai-confirm — confirmar pontuação individual (mantida)
router.post('/ai-confirm', requireAdmin, async (req, res) => {
  try {
    const { groupId, points, description, aiAnalysis, createdBy } = req.body;

    if (!groupId || points === undefined) {
      return res.status(400).json({ error: 'groupId e points são obrigatórios' });
    }

    const parsedPoints = parseInt(points);
    if (isNaN(parsedPoints)) {
      return res.status(400).json({ error: 'points deve ser um número inteiro' });
    }

    const { data, error } = await supabaseAdmin
      .from('scores')
      .insert({
        group_id: groupId,
        points: parsedPoints,
        reason: description?.trim() || 'Análise por IA',
        type: 'ai',
        ai_analysis: aiAnalysis || null,
        created_by: createdBy?.trim() || 'IA',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/scores/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('scores')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
