import 'dotenv/config';

import { connectRedis, disconnectRedis, isRedisConfigured } from './lib/redis';
import { closeFoodDiaryImportQueue, openFoodDiaryImportQueue } from './queues/foodDiaryImport.queue';
import { startFoodDiaryImportWorker, stopFoodDiaryImportWorker } from './queues/foodDiaryImport.worker';
import { processFoodDiaryImport } from './queues/importJobProcessor';

/**
 * Runs the import worker on its own, for deployments that set
 * IMPORT_WORKER_IN_API=false so slow AI imports cannot compete with API
 * requests for the same process. Imports only read text and call the AI,
 * so the worker needs Redis but not Mongo.
 */
async function startWorker(): Promise<void> {
  if (!isRedisConfigured()) {
    console.error('[Worker] REDIS_URL is not set: without Redis, imports run inside the API process');
    process.exit(1);
  }

  await connectRedis();
  // The worker needs the producer side too, to move exhausted jobs to the dead-letter queue.
  openFoodDiaryImportQueue();
  startFoodDiaryImportWorker(processFoodDiaryImport);
}

async function shutdown(signal: string): Promise<void> {
  console.log(`[Worker] ${signal} received, finishing running imports`);
  try {
    await stopFoodDiaryImportWorker();
    await Promise.all([closeFoodDiaryImportQueue(), disconnectRedis()]);
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Error while shutting down:', error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

startWorker().catch((error) => {
  console.error('[Worker] Startup failed:', error);
  process.exit(1);
});
