import { Redis } from 'ioredis';

/** Fail a stalled command quickly so a slow Redis degrades a request instead of hanging it. */
const COMMAND_TIMEOUT_MS = 2000;
/** How long startup waits for Redis before serving on the in-memory fallback. */
const STARTUP_WAIT_MS = 5000;

let client: Redis | null = null;
let hasConnected = false;
/**
 * ioredis retries every couple of seconds during an outage, emitting 'close'
 * and 'error' each time; these keep a long outage to one log line of each.
 */
let lastLoggedErrorCode: string | null = null;
let outageLogged = false;
const readyListeners: Array<() => void> = [];

export type RedisStatus = 'disabled' | 'connected' | 'unavailable';

/** Redis is optional: without `REDIS_URL` every Redis-backed store uses memory only. */
export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export function isRedisReady(): boolean {
  return client?.status === 'ready';
}

function handleReady(): void {
  lastLoggedErrorCode = null;
  outageLogged = false;
  console.log(hasConnected ? '[Redis] Reconnected' : '[Redis] Connected');
  if (!hasConnected) void warnIfRevocationsCanBeLost();
  hasConnected = true;
  readyListeners.forEach((listener) => listener());
}

function handleConnectionLost(): void {
  if (!hasConnected || outageLogged) return;
  outageLogged = true;
  console.error('[Redis] Connection lost, using in-memory stores until it reconnects');
}

function logConnectionError(error: NodeJS.ErrnoException): void {
  // Connection-refused errors arrive as an AggregateError with an empty message, so the code is logged too.
  const code = error.code ?? error.name;
  if (code === lastLoggedErrorCode) return;
  lastLoggedErrorCode = code;
  console.error(`[Redis] ${code}: ${error.message || 'connection error'} (retrying in the background)`);
}

function getRedisClient(): Redis {
  if (client) return client;
  if (!isRedisConfigured()) {
    throw new Error('REDIS_URL is not set; check isRedisConfigured() before using Redis');
  }

  client = new Redis(process.env.REDIS_URL!, {
    commandTimeout: COMMAND_TIMEOUT_MS,
    // Commands sent while disconnected fail at once instead of queueing, so
    // callers fall back to memory immediately rather than after timeouts.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  client.on('ready', handleReady);
  client.on('close', handleConnectionLost);
  client.on('error', logConnectionError);
  return client;
}

/** The client for sending commands. Callers check `isRedisReady()` first and fall back to memory otherwise. */
export function redisClient(): Redis {
  return getRedisClient();
}

/**
 * Runs `listener` every time the connection becomes ready, including
 * reconnects, and right away if it already is. Stores use it to attach to
 * Redis and replay what they buffered while it was away.
 */
export function onRedisReady(listener: () => void): void {
  if (!isRedisConfigured()) return;
  readyListeners.push(listener);
  if (isRedisReady()) listener();
}

/**
 * Revocation records must not disappear before they expire: an evicted or
 * lost key silently signs a revoked session back in. Managed Redis often
 * blocks CONFIG, in which case the settings cannot be checked from here.
 */
async function warnIfRevocationsCanBeLost(): Promise<void> {
  try {
    const redis = getRedisClient();
    const [, evictionPolicy] = (await redis.config('GET', 'maxmemory-policy')) as string[];
    const [, appendOnly] = (await redis.config('GET', 'appendonly')) as string[];
    if (evictionPolicy !== 'noeviction') {
      console.warn(
        `[Redis] maxmemory-policy is "${evictionPolicy}"; use "noeviction" so revoked sessions cannot be evicted (see REDIS.md)`
      );
    }
    if (appendOnly !== 'yes') {
      console.warn('[Redis] appendonly is off; a Redis restart will forget revoked sessions (see REDIS.md)');
    }
  } catch (error) {
    console.warn(
      `[Redis] Could not read eviction and persistence settings (${(error as Error).message}); ` +
        'make sure the instance uses noeviction and AOF persistence (see REDIS.md)'
    );
  }
}

/**
 * Starts connecting and waits briefly for Redis. An unreachable Redis does not
 * stop the server: every store serves from memory and switches to Redis once
 * ioredis's background reconnects succeed, so users are never locked out
 * because a cache is down. The URL is never logged, as it may hold a password.
 */
export async function connectRedis(): Promise<void> {
  if (!isRedisConfigured()) {
    console.log('[Redis] REDIS_URL not set, using in-memory stores');
    return;
  }
  const redis = getRedisClient();
  if (isRedisReady()) return;

  // Connection errors are expected while waiting (a Redis container may still
  // be booting), so this waits for 'ready' or the deadline, whichever is first.
  await new Promise<void>((resolve) => {
    const deadline = setTimeout(resolve, STARTUP_WAIT_MS);
    redis.once('ready', () => {
      clearTimeout(deadline);
      resolve();
    });
  });
  if (!isRedisReady()) {
    console.error(
      `[Redis] Not reachable after ${STARTUP_WAIT_MS / 1000}s; starting on in-memory stores and retrying in the background`
    );
  }
}

export function redisStatus(): RedisStatus {
  if (!isRedisConfigured()) return 'disabled';
  return isRedisReady() ? 'connected' : 'unavailable';
}

export async function disconnectRedis(): Promise<void> {
  if (!client) return;
  const closing = client;
  client = null;
  hasConnected = false;
  // QUIT needs a live connection; without one there is nothing to flush.
  if (closing.status === 'ready') await closing.quit();
  else closing.disconnect();
}
