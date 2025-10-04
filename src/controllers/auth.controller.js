// src/controllers/auth.controller.js
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// POST /register
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // prevent duplicate email
    const exists = await User.findOne({ email: email.toLowerCase() }).lean();
    if (exists) return res.status(409).json({ message: 'You are already a member' });

    // optional: auto-admin via env
    const adminList = (process.env.ADMIN_EMAILS || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const role = adminList.includes(email.toLowerCase()) ? 'admin' : 'user';

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role });

    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) { next(err); }
};

// POST /login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) find user
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('_id name email role passwordHash');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    // 2) verify password
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    // 3) (optional) create a server session (if you enabled express-session)
    if (req.session) {
      req.session.userId = String(user._id);
    }

    // 4) issue JWT for client (keep both session + JWT so dev is easy)
    const token = jwt.sign(
      { sub: String(user._id) },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 5) send response
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' }
    });
  } catch (err) { next(err); }
};

// POST /logout (if using sessions)
export const logout = (req, res) => {
  if (!req.session) return res.json({ message: 'logged out' });
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ message: 'logged out' });
  });
};
