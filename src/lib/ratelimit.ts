import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Buat instance Redis jika env tersedia
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimit: Ratelimit | null = null;

if (redisUrl && redisToken) {
  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  // Limit: 10 requests per 10 seconds untuk auth & sensitive API routes
  ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
    prefix: "@skillora/ratelimit",
  });
}

// In-memory fallback untuk local development tanpa Upstash keys
const localCache = new Map<string, { count: number; expiresAt: number }>();

export async function checkRateLimit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (ratelimit) {
    try {
      const result = await ratelimit.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (err) {
      console.warn("Upstash rate limit error, falling back to local:", err);
    }
  }

  // Fallback in-memory
  const now = Date.now();
  const windowMs = 10 * 1000;
  const maxRequests = 15;

  const current = localCache.get(identifier);
  if (!current || now > current.expiresAt) {
    localCache.set(identifier, { count: 1, expiresAt: now + windowMs });
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: now + windowMs };
  }

  if (current.count >= maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, reset: current.expiresAt };
  }

  current.count += 1;
  return { success: true, limit: maxRequests, remaining: maxRequests - current.count, reset: current.expiresAt };
}
