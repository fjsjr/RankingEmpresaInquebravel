export function requireAdmin(req, res, next) {
  const password = req.headers['x-admin-password'] || req.body?.adminPassword;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha de administrador inválida' });
  }

  next();
}
