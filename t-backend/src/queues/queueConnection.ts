import { Redis, RedisOptions } from 'ioredis';

/**
 * BullMQ gets its own connections rather than sharing `lib/redis`: a worker
 * blocks on its connection while waiting for jobs, and needs
 * `maxRetriesPerRequest: null`, which would make the shared client's
 * commands hang during an outage instead of failing fast.
 */
export function createQueueConnection(label: string, options: RedisOptions): Redis {
  const connection = new Redis(process.env.REDIS_URL!, options);
  // ioredis reports every reconnect attempt; one line per error kind keeps an outage readable.
  let lastLoggedCode: string | null = null;
  connection.on('ready', () => {
    lastLoggedCode = null;
  });
  connection.on('error', (error: NodeJS.ErrnoException) => {
    const code = error.code ?? error.name;
    if (code === lastLoggedCode) return;
    lastLoggedCode = code;
    console.error(`[ImportQueue] ${label} connection ${code}: ${error.message || 'connection error'}`);
  });
  return connection;
}

export async function closeQueueConnection(connection: Redis | null): Promise<void> {
  if (!connection) return;
  if (connection.status === 'ready') await connection.quit();
  else connection.disconnect();
}
