import type { IncrementResponse, Store } from "express-rate-limit";

import { logger } from "../utils/logger.js";
import type { RedisLike } from "./redisClient.js";

/**
 * Atomically increments the hit counter, sets the window TTL on the first hit,
 * and returns the new count plus the remaining TTL. Running the whole sequence
 * in one Lua script guarantees correctness even under concurrent requests.
 */
const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { hits, ttl }
`;

export interface RedisRateLimitStoreOptions {
  redis: RedisLike;
  /** Prefix applied to every key, e.g. `rl:api:` — keeps limiters isolated. */
  prefix: string;
  /** Fixed window length in milliseconds. */
  windowMs: number;
}

/**
 * An `express-rate-limit` store backed by Redis. Unlike the library's default
 * `MemoryStore` (process-local), counters live in Redis so limits apply across
 * every server instance. The window is a fixed window anchored on the first hit
 * (mirroring `MemoryStore` semantics).
 *
 * Keys are `${prefix}${keyGeneratorKey}`; the store announces its own prefix
 * through the `Store.prefix` contract so the library's double-count validation
 * keeps the two limiters (general API, auth) isolated.
 *
 * Redis failures are logged and rethrown: the limiter is configured with
 * `passOnStoreError` so a Redis outage degrades to "allow request" instead of
 * taking the API down. It must never be confused with distributed protection
 * while Redis is unreachable.
 */
export class RedisRateLimitStore implements Store {
  readonly localKeys = true;
  readonly prefix: string;

  private readonly redis: RedisLike;
  private readonly windowMs: number;

  constructor(options: RedisRateLimitStoreOptions) {
    this.redis = options.redis;
    this.prefix = options.prefix;
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const fullKey = `${this.prefix}${key}`;
    try {
      const [hits, ttl] = (await this.redis.eval(
        INCREMENT_SCRIPT,
        1,
        fullKey,
        String(this.windowMs),
      )) as [unknown, unknown];

      const totalHits = Number(hits);
      const ttlMs = Number(ttl);
      return {
        totalHits,
        resetTime: ttlMs >= 0 ? new Date(Date.now() + ttlMs) : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Redis rate-limit store unavailable; allowing the request (fail-open)", {
        error: message,
      });
      throw error;
    }
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(`${this.prefix}${key}`);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
  }
}
