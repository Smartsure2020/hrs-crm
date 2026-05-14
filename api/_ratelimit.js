let ratelimit = null;
let initTried = false;

export async function getRateLimiter() {
  if (initTried) return ratelimit;
  initTried = true;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis }     = await import('@upstash/redis');
    ratelimit = new Ratelimit({
      redis:   Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      prefix:  'hrs-crm-rl',
    });
  } catch (err) {
    console.warn('Rate limiter init failed, continuing without it:', err.message);
  }
  return ratelimit;
}
