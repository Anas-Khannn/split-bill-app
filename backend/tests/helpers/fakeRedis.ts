import type { RedisLike } from "../../src/redis/redisClient.js";

interface FakeRedisEntry {
  value: string;
  expiresAt: number | null;
}

/**
 * A self-contained in-memory implementation of the narrow {@link RedisLike}
 * contract, including the two Lua scripts used in production (the rate-limit
 * INCR/PEXPIRE/PTTL counter and the lock's ownership-safe GET/DEL release).
 * It honours PX TTLs so window-expiry and lock-expiry behavior can be tested
 * without a live Redis server.
 */
export class FakeRedis implements RedisLike {
  readonly status = "ready";
  readonly store = new Map<string, FakeRedisEntry>();

  private now(): number {
    return Date.now();
  }

  private evictExpired(key: string): void {
    const entry = this.store.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= this.now()) {
      this.store.delete(key);
    }
  }

  async set(
    key: string,
    value: string,
    mode: "PX",
    ttlMs: number,
    guard: "NX",
  ): Promise<"OK" | null> {
    this.evictExpired(key);
    if (guard === "NX" && this.store.has(key)) return null;
    this.store.set(key, {
      value,
      expiresAt: mode === "PX" ? this.now() + ttlMs : null,
    });
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    this.evictExpired(key);
    return this.store.get(key)?.value ?? null;
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      this.evictExpired(key);
      if (this.store.delete(key)) removed += 1;
    }
    return removed;
  }

  async decr(key: string): Promise<number> {
    this.evictExpired(key);
    const current = this.store.get(key);
    const next = (current ? Number(current.value) : 0) - 1;
    this.store.set(key, { value: `${next}`, expiresAt: current?.expiresAt ?? null });
    return next;
  }

  async ping(): Promise<string> {
    return "PONG";
  }

  async eval(
    script: string,
    numKeys: number,
    ...args: (string | number)[]
  ): Promise<unknown> {
    const key = String(args[0]);
    if (script.includes("PEXPIRE")) {
      const windowMs = Number(args[numKeys]);
      this.evictExpired(key);
      const previous = this.store.get(key);
      const hits = (previous ? Number(previous.value) : 0) + 1;
      const expiresAt =
        hits === 1 ? this.now() + windowMs : (previous?.expiresAt ?? this.now() + windowMs);
      this.store.set(key, { value: `${hits}`, expiresAt });
      return [hits, Math.max(0, expiresAt - this.now())];
    }

    // Ownership-safe release: only the holder may remove the key.
    const token = String(args[numKeys]);
    this.evictExpired(key);
    const entry = this.store.get(key);
    if (entry && entry.value === token) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }
}

/**
 * Mimics a Redis client whose socket is down: every mutating command rejects
 * immediately (the production client is created with `enableOfflineQueue:
 * false`). Used to exercise the fail-open / degraded paths.
 */
export class FailingRedis implements RedisLike {
  readonly status = "reconnecting";

  private fail(): Promise<never> {
    return Promise.reject(new Error("Connection is closed."));
  }

  eval(): Promise<unknown> {
    return this.fail();
  }

  set(): Promise<"OK" | null> {
    return this.fail();
  }

  get(): Promise<string | null> {
    return this.fail();
  }

  del(): Promise<number> {
    return this.fail();
  }

  decr(): Promise<number> {
    return this.fail();
  }

  ping(): Promise<string> {
    return Promise.resolve("PONG");
  }
}
