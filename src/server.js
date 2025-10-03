import dotenv from 'dotenv';
dotenv.config();


import app from './app.js';
import { connectDB } from './config/db.js';
// import { initRedis } from './config/redis.js';

import { watchUserDeletions } from './config/watchUsers.js';


const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB();
    // if (process.env.REDIS_URL) await initRedis();
    app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();


await connectDB();
watchUserDeletions();