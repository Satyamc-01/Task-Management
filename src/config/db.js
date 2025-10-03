import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB;
  if (!uri) throw new Error('MONGO_URI missing');
  if (!dbName) throw new Error('MONGO_DB missing');

  await mongoose.connect(uri, {
    dbName,
    maxPoolSize: 10
  });
  console.log('MongoDB connected');
}