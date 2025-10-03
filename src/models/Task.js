import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    dueDate: { type: Date },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending', index: true },
    owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    sharedWith: [{ type: Types.ObjectId, ref: 'User', index: true }]
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);
