import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const allowedStatuses = new Set(['pending', 'completed']);

export const createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, status, sharedWithIds, sharedWithEmails } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: 'title is required' });
    if (status && !allowedStatuses.has(status))
      return res.status(400).json({ message: 'status must be pending or completed' });

    let due;
    if (dueDate) {
      const d = new Date(dueDate);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid dueDate' });
      due = d;
    }

    // Build a set of user IDs to share with (exclude self)
    const shareSet = new Set();

    // A) by IDs
    if (Array.isArray(sharedWithIds) && sharedWithIds.length) {
      const distinct = [...new Set(sharedWithIds)].filter(isObjectId);
      if (distinct.length) {
        const found = await User.find({ _id: { $in: distinct } }).select('_id').lean();
        const foundIds = new Set(found.map(u => u._id.toString()));
        const missing = distinct.filter(id => !foundIds.has(id));
        if (missing.length) return res.status(400).json({ message: 'Some user IDs not found' });

        for (const id of distinct) {
          if (id !== req.user._id.toString()) shareSet.add(id);
        }
      }
    }

    // B) (optional) by emails
    if (Array.isArray(sharedWithEmails) && sharedWithEmails.length) {
      const emails = [...new Set(
        sharedWithEmails.map(e => (e || '').toString().trim().toLowerCase()).filter(Boolean)
      )];
      if (emails.length) {
        const users = await User.find({ email: { $in: emails } }).select('_id email').lean();
        const foundEmails = new Set(users.map(u => u.email));
        const missing = emails.filter(e => !foundEmails.has(e));
        if (missing.length) return res.status(400).json({ message: `Users not found: ${missing.join(', ')}` });

        users.forEach(u => {
          if (!u._id.equals(req.user._id)) shareSet.add(u._id.toString());
        });
      }
    }

    const sharedWith = [...shareSet].map(id => new mongoose.Types.ObjectId(id));

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim(),
      dueDate: due,
      status: status || 'pending',
      owner: req.user._id,
      sharedWith,
    });

    return res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    // Optional filter ahead of time (for step 4)
    const { filter } = req.query;
    let statusQ;
    if (filter) {
      if (!['all', 'pending', 'completed'].includes(filter)) {
        return res.status(400).json({ message: 'filter must be all|pending|completed' });
      }
      if (filter !== 'all') statusQ = filter;
    }

    const q = {
      $or: [{ owner: req.user._id }, { sharedWith: req.user._id }],
      ...(statusQ ? { status: statusQ } : {}),
    };

    const tasks = await Task.find(q)
      .populate('sharedWith', 'name email')  // add this
  .populate('owner', 'name email')       // optional
  .sort({ dueDate: 1, createdAt: -1 });

    return res.json(tasks);
  } catch (err) {
    next(err);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid task id' });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const canView =
      task.owner.equals(req.user._id) ||
      task.sharedWith.some((u) => u.equals?.(req.user._id));

    if (!canView) return res.status(403).json({ message: 'Not allowed' });

    return res.json(task);
  } catch (err) {
    next(err);
  }
};


export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid task id' });

    const {
      title,
      description,
      dueDate,
      status,
      sharedWithIds,     // owner-only
      sharedWithEmails,  // owner-only (optional)
      owner,             // never allowed
      ...rest
    } = req.body;

    if (owner !== undefined) {
      return res.status(400).json({ message: 'Owner cannot be changed' });
    }
    if (status && !allowedStatuses.has(status)) {
      return res.status(400).json({ message: 'status must be pending or completed' });
    }
    if (Object.keys(rest).length) {
      return res.status(400).json({ message: 'Unexpected fields in body' });
    }

    // Build updates object
    const updates = {};
    if (title !== undefined) updates.title = title?.toString().trim();
    if (description !== undefined) updates.description = description?.toString().trim();
    if (dueDate !== undefined) {
      if (!dueDate) updates.dueDate = undefined;
      else {
        const d = new Date(dueDate);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid dueDate' });
        updates.dueDate = d;
      }
    }
    if (status !== undefined) updates.status = status;

    // If owner sent assignee changes, compute replacement array
    if (Array.isArray(sharedWithIds) || Array.isArray(sharedWithEmails)) {
      const shareSet = new Set();

      if (Array.isArray(sharedWithIds)) {
        const ids = [...new Set(sharedWithIds)].filter(isObjectId);
        if (ids.length) {
          const found = await User.find({ _id: { $in: ids } }).select('_id').lean();
          const foundIds = new Set(found.map(u => u._id.toString()));
          const missing = ids.filter(x => !foundIds.has(x));
          if (missing.length) return res.status(400).json({ message: 'Some user IDs not found' });
          ids.forEach(x => { if (x !== req.user._id.toString()) shareSet.add(x); });
        }
      }

      if (Array.isArray(sharedWithEmails)) {
        const emails = [...new Set(
          sharedWithEmails.map(e => (e || '').toString().trim().toLowerCase()).filter(Boolean)
        )];
        if (emails.length) {
          const users = await User.find({ email: { $in: emails } }).select('_id email').lean();
          const foundEmails = new Set(users.map(u => u.email));
          const missing = emails.filter(e => !foundEmails.has(e));
          if (missing.length) return res.status(400).json({ message: `Users not found: ${missing.join(', ')}` });
          users.forEach(u => { if (!u._id.equals(req.user._id)) shareSet.add(u._id.toString()); });
        }
      }

      updates.sharedWith = [...shareSet].map(x => new mongoose.Types.ObjectId(x));
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No changes supplied' });
    }

    // PERMISSION: shared users can change ONLY status; all other updates are owner-only
    const isStatusOnly = Object.keys(updates).length === 1 && updates.status !== undefined;

    const query = isStatusOnly
      ? { _id: id, $or: [{ owner: req.user._id }, { sharedWith: req.user._id }] }
      : { _id: id, owner: req.user._id };

    const task = await Task.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('sharedWith', 'name email')
      .populate('owner', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found or not owner' });
    }
    return res.json(task);
  } catch (err) {
    next(err);
  }
};


export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid task id' });

    const task = await Task.findOneAndDelete({ _id: id, owner: req.user._id }); // owner-only
    if (!task) return res.status(404).json({ message: 'Task not found or not owner' });

    return res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

export const shareTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emails = [] } = req.body;

    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid task id' });
    if (!Array.isArray(emails) || emails.length === 0)
      return res.status(400).json({ message: 'emails must be a non-empty array' });

    const norm = [...new Set(emails.map(e => (e || '').toString().trim().toLowerCase()).filter(Boolean))];
    const users = await User.find({ email: { $in: norm } }, { _id: 1, email: 1 });
    const foundEmails = new Set(users.map(u => u.email));
    const missing = norm.filter(e => !foundEmails.has(e));
    if (missing.length) return res.status(400).json({ message: `Users not found: ${missing.join(', ')}` });

    const ids = users.map(u => u._id).filter(uid => !uid.equals(req.user._id));

    const task = await Task.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { $addToSet: { sharedWith: { $each: ids } } },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found or not owner' });

    res.json(task);
  } catch (err) {
    next(err);
  }
};

// OWNER-ONLY: unshare task
export const unshareTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emails = [] } = req.body;

    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid task id' });
    if (!Array.isArray(emails) || emails.length === 0)
      return res.status(400).json({ message: 'emails must be a non-empty array' });

    const norm = [...new Set(emails.map(e => (e || '').toString().trim().toLowerCase()).filter(Boolean))];
    const users = await User.find({ email: { $in: norm } }, { _id: 1 });
    const ids = users.map(u => u._id);

    const task = await Task.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { $pull: { sharedWith: { $in: ids } } },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found or not owner' });

    res.json(task);
  } catch (err) {
    next(err);
  }
};
