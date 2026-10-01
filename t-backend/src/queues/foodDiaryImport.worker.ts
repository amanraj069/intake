import { UnrecoverableError, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import {
  FoodDiaryImportJobData,
  decodeImportJobFailure,
  encodeImportJobFailure,
  progressForStage,
  toImportJobFailure,
} from '../lib/foodDiaryImportJob';
import { isRedisConfigured } from '../lib/redis';
import { redisKeys } from '../lib/redisKeys';
import type { FoodDiaryPreview } from '../services/foodDiaryPreview.service';
import {
  FOOD_DIARY_IMPORT_QUEUE,
  FoodDiaryImportJob,
  addToDeadLetterQueue,
  pruneDeadLetters,
} from './foodDiaryImport.queue';
import { ImportJobProcessor } from './importJobProcessor';
import { readImportQueueSettings } from './importQueueSettings';
import { closeQueueConnection, createQueueConnection } from './queueConnection';

const DEAD_LETTER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

let worker: Worker<FoodDiaryImportJobData, FoodDiaryPreview> | null = null;
let workerConnection: Redis | null = null;

/**
 * Runs one attempt. A failure about the file (not a diary, no entries) is
 * thrown as unrecoverable, so BullMQ fails the job at once instead of
 * spending its retries; a provider outage is thrown plainly and retried.
 */
async function runImportAttempt(job: FoodDiaryImportJob, processImport: ImportJobProcessor): Promise<FoodDiaryPreview> {
  try {
    return await processImport(job.data, (stage) => job.updateProgress(progressForStage(stage)));
  } catch (cause) {
    const failure = toImportJobFailure(cause);
    const reason = encodeImportJobFailure(failure);
    throw failure.retryable ? new Error(reason) : new UnrecoverableError(reason);
  }
}

/** Only failures the service caused are dead-lettered; a PDF that is not a diary is the user's to fix. */
async function deadLetterIfExhausted(job: FoodDiaryImportJob | undefined): Promise<void> {
  if (!job?.id) return;
  const failure = decodeImportJobFailure(job.failedReason);
  const attemptsAllowed = job.opts.attempts ?? 1;
  if (!failure.retryable || job.attemptsMade < attemptsAllowed) return;

  console.error(`[ImportQueue] Job ${job.id} failed all ${job.attemptsMade} attempts (${failure.code}), dead-lettered`);
  try {
    await addToDeadLetterQueue({
      jobId: job.id,
      data: job.data,
      failure,
      attemptsMade: job.attemptsMade,
      failedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[ImportQueue] Could not dead-letter job ${job.id}:`, (error as Error).message);
  }
}

/** Starts consuming imports. A no-op without Redis, where uploads run on the in-memory queue instead. */
export function startFoodDiaryImportWorker(processImport: ImportJobProcessor): void {
  if (!isRedisConfigured() || worker) return;

  const { concurrency, jobsPerMinute } = readImportQueueSettings();
  workerConnection = createQueueConnection('worker', { maxRetriesPerRequest: null });
  worker = new Worker<FoodDiaryImportJobData, FoodDiaryPreview>(
    FOOD_DIARY_IMPORT_QUEUE,
    (job) => runImportAttempt(job, processImport),
    {
      connection: workerConnection,
      prefix: redisKeys.queuePrefix,
      concurrency,
      // Shared through Redis, so the cap holds across every worker process together.
      limiter: { max: jobsPerMinute, duration: ONE_MINUTE_MS },
    }
  );

  worker.on('failed', (job) => void deadLetterIfExhausted(job));
  worker.on('error', (error) => console.error('[ImportQueue] Worker error:', error.message));
  worker.on('ready', () => {
    pruneDeadLetters(DEAD_LETTER_RETENTION_MS).catch((error: Error) =>
      console.error('[ImportQueue] Could not prune dead letters:', error.message)
    );
  });
  console.log(`[ImportQueue] Worker started (concurrency ${concurrency}, ${jobsPerMinute} imports/min)`);
}

/**
 * Waits for running imports to finish. If shutdown cuts that short, BullMQ
 * sees the job's lock expire and hands it to another worker as stalled, so an
 * import interrupted by a deploy is retried rather than lost.
 */
export async function stopFoodDiaryImportWorker(): Promise<void> {
  await worker?.close();
  await closeQueueConnection(workerConnection);
  worker = null;
  workerConnection = null;
}
