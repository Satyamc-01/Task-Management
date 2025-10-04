import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  // 1) Session cookie path
  if (req.session?.userId) {
    req.user = { _id: req.session.userId };  // keep shape consistent
    return next();
  }

  // 2) Fallback: Bearer JWT (if you want to keep both)
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: payload.sub };
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
