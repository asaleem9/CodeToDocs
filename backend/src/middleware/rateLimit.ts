import { Request, Response, NextFunction } from 'express';
import { getUserId } from './auth';

interface RateLimitOptions {
  windowMs: number; // window size in milliseconds
  max: number; // max requests per key per window
  keyPrefix: string; // namespace so different limiters don't collide
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Minimal in-memory fixed-window rate limiter. Keyed by the authenticated
 * user's id, falling back to client IP for anyone without one. Deliberately
 * does NOT key by getStorageUserId's anonymous id: that id is minted fresh
 * on demand (a new session, or a new /api/auth/anon bearer token), so keying
 * by it would let a caller shed its bucket just by dropping cookies or
 * requesting a new anon token. Keying anonymous traffic by IP instead gives
 * every anonymous caller sharing that IP a shared ceiling, which is the
 * actual abuse control we want on the paid LLM endpoints. For a
 * multi-instance deployment this should be backed by a shared store, but it
 * meaningfully raises the bar as-is.
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix } = options;
  const buckets = new Map<string, Bucket>();

  // Periodically drop expired buckets so the map doesn't grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  // Don't keep the process alive just for the sweep.
  if (typeof sweep.unref === 'function') sweep.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const userId = getUserId(req);
    const identity = userId !== null ? userId : (req.ip ?? 'unknown');
    const key = `${keyPrefix}:${identity}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
      });
    }

    next();
  };
}
