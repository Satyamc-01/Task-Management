import User from '../models/User.js';
import Task from '../models/Task.js';
import { isProtectedUser } from '../utils/protected.js';

export const listUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q
      ? { $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }] }
      : {};

    const docs = await User.find(filter).select('_id name email').limit(200).lean();
    const me = req.user._id.toString();

    const users = docs
      .filter(u => u._id.toString() !== me)
      .map(u => ({ id: u._id, name: u.name, email: u.email }));

    res.json(users);
  } catch (err) {
    next(err);
  }
};


export const deleteMe = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1) delete tasks the user owns
    const owned = await Task.deleteMany({ owner: userId });

    // 2) remove user from other tasks' shared lists
    const pulled = await Task.updateMany(
      { sharedWith: userId },
      { $pull: { sharedWith: userId } }
    );

    // 3) delete the user
    await User.deleteOne({ _id: userId });

    return res.json({
      message: 'Account deleted',
      tasksDeleted: owned.deletedCount || 0,
      removedFromShared: pulled.modifiedCount || 0,
    });
  } catch (err) {
    next(err);
  }
};

export const adminListUsers = async (req, res, next) => {
  try {
    const docs = await User.find({}).select('_id name email role createdAt').lean();
    const actorProtected = isProtectedUser(req.user);
    const users = docs.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role || 'user',
      protected: isProtectedUser(u),
      createdAt: u.createdAt
    }));
    res.json({ actorProtected, users });
  } catch (err) { next(err); }
};

export const adminSetUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'user' | 'manager' | 'admin'
    if (!['user','manager','admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const target = await User.findById(id).select('_id name email role');
    if (!target) return res.status(404).json({ message: 'User not found' });

    const targetProtected = isProtectedUser(target);
    const actorProtected = isProtectedUser(req.user);

    // Founding admins (from env) cannot be modified by non-protected admins.
    if (targetProtected && !actorProtected) {
      return res.status(403).json({ message: 'This user is protected and cannot be modified' });
    }


    target.role = role;
    await target.save();

    res.json({ id: target._id, name: target.name, email: target.email, role: target.role, protected: targetProtected });
  } catch (err) { next(err); }
};