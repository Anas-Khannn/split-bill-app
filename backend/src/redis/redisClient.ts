import { Redis } from "ioredis";

import { loadEnv } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Narrow, dependency-free view of a Redis client shared by the rate-limit
 * store, the distributed lock, and the background job queue. Kept deliberately
 * small so tests can inject a fake implementation that mirrors ioredis'
 * command semantics without pulling in a live Redis server.
 *
 * The `set` guard is optional: when omitted ioredis performs a plain overwrite
 * (used by the job queue to refresh a payload's TTL on retry), while the lock
 * and the queue's in-flight lease pass `"NX"` for set-if-absent semantics.
 */
export interface RedisLike {
  readonly status: string;
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  set(
    key: string,
    value: string,
    mode: "PX",
    ttlMs: number,
    guard?: "NX" | "XX",
  ): Promise<"OK" | null>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  decr(key: string): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, member: string): Promise<number>;
  ping(): Promise<string>;
}

/**
 * Adapts ioredis to the minimal {@link RedisLike} contract. `enableOfflineQueue`
 * is disabled so commands fail immediately whenever the client is not connected
 * (deterministic fail-open instead of queueing requests indefinitely). The
 * client is created lazily and only ever connects when {@link connectRedis} is
 * called, so tests never open a socket by accident.
 */
export function createRedisAdapter(client: Redis): RedisLike {
  return {
    get status() {
      return client.status;
    },
    eval: (script, numKeys, ...args) => client.eval(script, numKeys, ...args),
    set: (key, value, mode, ttlMs, guard) => {
      if (guard === undefined) {
        return client.set(key, value, mode, ttlMs) as Promise<"OK" | null>;
      }
      if (guard === "NX") {
        return client.set(key, value, mode, ttlMs, "NX") as Promise<"OK" | null>;
      }
      return client.set(key, value, mode, ttlMs, "XX") as Promise<"OK" | null>;
    },
    get: (key) => client.get(key),
    del: (...keys) => client.del(...keys),
    decr: (key) => client.decr(key),
    zadd: (key, score, member) => client.zadd(key, score, member),
    zrem: (key, member) => client.zrem(key, member),
    ping: () => client.ping(),
  };
}

let _client: Redis | null = null;

/**
 * Returns the lazily created ioredis singleton. The underlying socket is never
 * opened until {@link connectRedis} is called, so importing this module (or the
 * modules that use it) has no side effects.
 *
 * The REDIS_URL may embed credentials, so it is never logged.
 */
export function getRedisClient(): Redis {
  if (!_client) {
    const { REDIS_URL } = loadEnv();
    _client = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
    });

    _client.on("error", (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Redis connection error", { error: message });
    });
    _client.on("ready", () => {
      logger.info("Redis is ready");
    });
  }
  return _client;
}

/**
 * Returns the Redis client narrowed to the {@link RedisLike} contract for use
 * by the rate-limit store and distributed lock.
 */
export function getRedis(): RedisLike {
  return createRedisAdapter(getRedisClient());
}

/**
 * Establishes the Redis connection. On failure the server keeps running with
 * degraded behavior (rate limiting falls back to the in-memory store and
 * distributed locking is skipped with a warning); nothing is fatal.
 */
export async function connectRedis(): Promise<boolean> {
  const client = getRedisClient();
  try {
    await client.connect();
    await client.ping();
    logger.info("Connected to Redis");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Redis is unavailable; continuing with degraded behavior", { error: message });
    return false;
  }
}

/**
 * Returns whether the singleton Redis client is currently connected. Used to
 * decide whether rate limiting should share state across instances.
 */
export function isRedisAvailable(): boolean {
  return _client !== null && _client.status === "ready";
}

/**
 * Gracefully closes the Redis connection during shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  const client = _client;
  _client = null;
  if (!client) return;

  try {
    await client.quit();
  } catch {
    try {
      client.disconnect();
    } catch {
      // The client is already gone; nothing left to close.
    }
  }
}
