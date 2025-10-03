import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';

// POST /register
export const register = async (req, res, next) => {
  try {
    const { name, email = '', password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // optional: make certain emails admin from .env
    const adminList = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const role = adminList.includes(normalizedEmail) ? 'admin' : 'user';

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name, email: normalizedEmail, passwordHash, role });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    // Handle duplicate email nicely
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    next(err);
  }
};

// POST /login
export const login = async (req, res, next) => {
  try {
    const { email = '', password } = req.body;

    // If passwordHash has select:false in the schema, prefer +passwordHash
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('_id name email role +passwordHash');

    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });


req.session.userId = String(user._id);
res.json({
  user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' }
  // you can still return token if you want both, but not required for sessions
});

    // Use the helper so you don't need to import jsonwebtoken here
    const token = signToken(user._id);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' }
    });
  } catch (err) {
    next(err);
  }
};

// POST /logout
export const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ message: 'logged out' });
  });
};