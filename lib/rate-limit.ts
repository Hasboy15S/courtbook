/**
 * In-memory sliding window rate limiter
 * Menyediakan proteksi DDoS / Brute Force pada endpoint autentikasi dan pembuatan pembayaran
 */

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 10 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      const valid = record.timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, { timestamps: valid });
      }
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
}

export function rateLimit(
  key: string,
  limit = 10,
  windowSeconds = 60
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = store.get(key) || { timestamps: [] };

  const validTimestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const resetSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return {
      success: false,
      remaining: 0,
      resetSeconds,
    };
  }

  validTimestamps.push(now);
  store.set(key, { timestamps: validTimestamps });

  return {
    success: true,
    remaining: limit - validTimestamps.length,
    resetSeconds: windowSeconds,
  };
}
