import { isRedisConfigured, isRedisReady, onRedisReady, redisClient } from './redis';

/** A string key-value store whose entries expire on their own. */
export interface TtlStore {
  /** Reads several keys in one round trip; missing keys come back as null, in order. */
  getMany(keys: string[]): Promise<(string | null)[]>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

interface BufferedEntry {
  key: string;
  value: string;
  ttlSeconds: number;
}

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Entries live only in this process, so they vanish on restart and are not
 * seen by other instances. Used on its own without Redis, and as the outage
 * buffer of the Redis-backed store.
 */
export class MemoryTtlStore implements TtlStore {
  private readonly entries = new Map<string, { value: string; expiresAt: number }>();

  constructor() {
    // Expired entries are also dropped on read; the sweep only bounds memory
    // for keys nobody reads again. unref() keeps it from holding the process open.
    setInterval(() => this.sweepExpired(), SWEEP_INTERVAL_MS).unref();
  }

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  async getMany(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  /** Removes and returns every unexpired entry with its remaining lifetime. */
  drain(): BufferedEntry[] {
    const now = Date.now();
    const live: BufferedEntry[] = [];
    for (const [key, { value, expiresAt }] of this.entries) {
      const ttlSeconds = Math.ceil((expiresAt - now) / 1000);
      if (ttlSeconds > 0) live.push({ key, value, ttlSeconds });
    }
    this.entries.clear();
    return live;
  }

  private sweepExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}

/**
 * Shared across instances and kept across restarts while Redis is reachable.
 * While it is not, writes go to this process's memory and reads fall back to
 * it, so sign-in and sign-out keep working; on reconnect the buffered writes
 * are copied to Redis so every instance sees them.
 */
class ResilientRedisTtlStore implements TtlStore {
  private readonly buffer = new MemoryTtlStore();

  constructor() {
    onRedisReady(() => void this.replayBuffered());
  }

  async getMany(keys: string[]): Promise<(string | null)[]> {
    const buffered = await this.buffer.getMany(keys);
    if (!isRedisReady()) return buffered;
    try {
      const stored = await redisClient().mget(keys);
      // A write buffered during an outage counts until its replay lands.
      return stored.map((value, index) => value ?? buffered[index]);
    } catch (error) {
      console.error(`[Redis] Read failed, using in-memory values: ${(error as Error).message}`);
      return buffered;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (isRedisReady()) {
      try {
        await redisClient().set(key, value, 'EX', ttlSeconds);
        return;
      } catch (error) {
        console.error(`[Redis] Write failed, buffering in memory: ${(error as Error).message}`);
      }
    }
    await this.buffer.set(key, value, ttlSeconds);
  }

  private async replayBuffered(): Promise<void> {
    const entries = this.buffer.drain();
    if (entries.length === 0) return;

    const pipeline = redisClient().pipeline();
    entries.forEach(({ key, value, ttlSeconds }) => pipeline.set(key, value, 'EX', ttlSeconds));
    try {
      const results = (await pipeline.exec()) ?? [];
      const failed = entries.filter((_, index) => results[index]?.[0]);
      await this.rebuffer(failed);
      console.log(`[Redis] Replayed ${entries.length - failed.length} buffered session records`);
    } catch (error) {
      console.error(`[Redis] Replay failed, keeping records in memory: ${(error as Error).message}`);
      await this.rebuffer(entries);
    }
  }

  private async rebuffer(entries: BufferedEntry[]): Promise<void> {
    await Promise.all(
      entries.map(({ key, value, ttlSeconds }) => this.buffer.set(key, value, ttlSeconds))
    );
  }
}

export function createTtlStore(): TtlStore {
  return isRedisConfigured() ? new ResilientRedisTtlStore() : new MemoryTtlStore();
}
