import { Router } from 'express';

const router = Router();

// POST /api/auth/validate — verifica a senha do admin
router.post('/validate', (req, res) => {
  const password = req.headers['x-admin-password'] || req.body?.adminPassword;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  res.json({ ok: true });
});

export default router;
