import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Task from './Task.js';




const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user', index: true }
  },
  { timestamps: true }
);

userSchema.statics.hashPassword = async function (plain) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  return bcrypt.hash(plain, rounds);
};

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.post('findOneAndDelete', async function(doc) {
  if (!doc) return;
  await Task.deleteMany({ owner: doc._id });
  await Task.updateMany({ sharedWith: doc._id }, { $pull: { sharedWith: doc._id } });
});

export default mongoose.model('User', userSchema);
