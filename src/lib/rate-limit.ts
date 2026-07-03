// In-memory fixed-window rate limiter. Good enough for a single Node
// process; once this runs on more than one instance, back this with
// something shared (e.g. Redis) instead — separate counters per instance
// mean the real limit becomes (limit × instance count).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}
