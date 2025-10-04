import { createClient } from 'redis';

const url = process.env.REDIS_URL || '';

/**
 * Create the client only if REDIS_URL is present.
 * Enable TLS for rediss:// URLs.
 */
export const redis = url
  ? createClient({
      url,
      socket: url.startsWith('rediss://') ? { tls: true } : {}
    })
  : null;

// log the first error only, avoid endless spam
let logged = false;
if (redis) {
  redis.on('error', (e) => {
    if (!logged) {
      console.warn('[redis] error:', e.message);
      logged = true;
    }
  });
}

export async function initRedis() {
  if (!redis) {
    console.log('[redis] REDIS_URL not set — skipping');
    return;
  }
  if (redis.isOpen) return;
  await redis.connect();
  console.log('[redis] connected');
}
