import User from '../models/User.js';
import Task from '../models/Task.js';

export function watchUserDeletions() {
  // Works on Atlas out of the box; for local Mongo you need a replica set.
  const stream = User.watch([{ $match: { operationType: 'delete' } }]);

  stream.on('change', async (change) => {
    try {
      const userId = change.documentKey._id;
      const del = await Task.deleteMany({ owner: userId });
      const pull = await Task.updateMany({ sharedWith: userId }, { $pull: { sharedWith: userId } });
      console.log(`Cascade (watch): deleted=${del.deletedCount || 0}, cleanedShares=${pull.modifiedCount || 0} for user ${userId}`);
    } catch (err) {
      console.error('Cascade (watch) error:', err);
    }
  });

  stream.on('error', (err) => {
    console.error('User change stream error:', err);
  });
}
