import { createClient } from 'redis';

const url = process.env.REDIS_URL;
export const redis = createClient({ url });

redis.on('error', (e) => console.error('[redis] error:', e.message));
export async function initRedis() {
  if (!redis.isOpen) await redis.connect();
  console.log('[redis] connected');
}
