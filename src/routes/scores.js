import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';
import { rankAllGroups, rankCinGroups, analyzeActivity } from '../services/ai-analyzer.js';

const router = Router();

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
      result = await rankCinGroups({ context: context?.trim() || '', responses });
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
