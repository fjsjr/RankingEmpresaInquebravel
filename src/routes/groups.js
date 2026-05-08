import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

// GET /api/groups — ranking completo
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ranking')
      .select('*')
      .order('position');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:id/participants
router.get('/:id/participants', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('participants')
      .select('*')
      .eq('group_id', req.params.id)
      .order('name');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:id/scores
router.get('/:id/scores', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('scores')
      .select('*')
      .eq('group_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups — criar grupo (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Nome do grupo é obrigatório' });
    }

    // Bug 7 fix: valida formato hex da cor
    const safeColor = HEX_COLOR_RE.test(color) ? color : '#3B82F6';

    const { data, error } = await supabaseAdmin
      .from('groups')
      .insert({ name: name.trim(), color: safeColor })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:id/participants — adicionar participante (admin)
router.post('/:id/participants', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Nome do participante é obrigatório' });
    }

    const { data, error } = await supabaseAdmin
      .from('participants')
      .insert({ group_id: req.params.id, name: name.trim() })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/reset/scores — zera pontuações (admin)
// IMPORTANTE: rotas específicas ANTES de /:id
router.delete('/reset/scores', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('scores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: 'Todas as pontuações foram removidas.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/reset/all — reset completo (admin)
router.delete('/reset/all', requireAdmin, async (req, res) => {
  try {
    const { error: scoresErr } = await supabaseAdmin
      .from('scores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (scoresErr) return res.status(500).json({ error: scoresErr.message });

    const { error: participantsErr } = await supabaseAdmin
      .from('participants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (participantsErr) return res.status(500).json({ error: participantsErr.message });

    const { error: groupsErr } = await supabaseAdmin
      .from('groups')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (groupsErr) return res.status(500).json({ error: groupsErr.message });

    res.json({ success: true, message: 'Sistema resetado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:id — remover grupo (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('groups')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:groupId/participants/:participantId
router.delete('/:groupId/participants/:participantId', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('participants')
      .delete()
      .eq('id', req.params.participantId)
      .eq('group_id', req.params.groupId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
