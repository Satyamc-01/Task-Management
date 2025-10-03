const ORDER = ['user', 'manager', 'admin'];

export const requireRole = (...allowed) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const role = req.user.role || 'user';
  const ok = allowed.some(r => ORDER.indexOf(role) >= ORDER.indexOf(r));
  if (!ok) return res.status(403).json({ message: 'Forbidden' });
  next();
};