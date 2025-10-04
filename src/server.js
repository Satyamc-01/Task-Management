import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { initRedis } from './config/redis.js';

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB();
    try {
      await initRedis(); // will skip if REDIS_URL not set
    } catch (e) {
      console.warn('[redis] init failed:', e.message, '→ using memory store / no cache');
    }
    app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
