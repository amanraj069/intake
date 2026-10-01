import {
  ClientRateLimitInfo,
  IncrementResponse,
  MemoryStore,
  Options,
  Store,
} from 'express-rate-limit';
import { RedisReply, RedisStore } from 'rate-limit-redis';

import { isRedisReady, onRedisReady, redisClient } from './redis';

/**
 * Counts in Redis while it is reachable and in this process's memory while it
 * is not, so a Redis outage never switches a limit off (letting brute force
 * through) or rejects a request. During an outage each instance counts on its
 * own, as it does without Redis at all.
 */
export class FallbackRateLimitStore implements Store {
  private readonly memory = new MemoryStore();
  private redis: RedisStore | null = null;
  private options: Options | null = null;

  constructor(private readonly keyPrefix: string) {}

  init(options: Options): void {
    this.options = options;
    this.memory.init(options);
    onRedisReady(() => void this.attachRedis());
  }

  /**
   * Rebuilt on every (re)connect: RedisStore loads its Lua scripts once, in
   * init, and a load that failed while Redis was down would otherwise stick.
   */
  private async attachRedis(): Promise<void> {
    const store = new RedisStore({
      prefix: this.keyPrefix,
      sendCommand: async (command: string, ...args: string[]) =>
        redisClient().call(command, ...args) as Promise<RedisReply>,
    });
    try {
      await store.init(this.options!);
      this.redis = store;
    } catch (error) {
      console.error(`[RateLimit] Could not attach Redis store, counting in memory: ${(error as Error).message}`);
    }
  }

  private async withFallback<T>(operation: (store: Store) => Promise<T> | T): Promise<T> {
    if (this.redis && isRedisReady()) {
      try {
        return await operation(this.redis);
      } catch (error) {
        console.error(`[RateLimit] Redis store failed, counting in memory: ${(error as Error).message}`);
      }
    }
    return operation(this.memory);
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    return this.withFallback((store) => store.get?.(key));
  }

  async increment(key: string): Promise<IncrementResponse> {
    return this.withFallback((store) => store.increment(key));
  }

  async decrement(key: string): Promise<void> {
    await this.withFallback((store) => store.decrement(key));
  }

  async resetKey(key: string): Promise<void> {
    await this.withFallback((store) => store.resetKey(key));
  }

  shutdown(): void {
    this.memory.shutdown();
  }
}
