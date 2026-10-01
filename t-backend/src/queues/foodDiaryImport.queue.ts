import { randomUUID } from 'node:crypto';
import { Job, JobState, Queue } from 'bullmq';
import { Redis } from 'ioredis';

import {
  FoodDiaryImportJobData,
  IMPORT_RETRY_POLICY,
  ImportJobFailure,
  ImportJobProgress,
  ImportJobState,
  ImportJobView,
  decodeImportJobFailure,
} from '../lib/foodDiaryImportJob';
import { isRedisConfigured } from '../lib/redis';
import { redisKeys } from '../lib/redisKeys';
import type { FoodDiaryPreview } from '../services/foodDiaryPreview.service';
import { closeQueueConnection, createQueueConnection } from './queueConnection';

export const FOOD_DIARY_IMPORT_QUEUE = 'food-diary-import';
const DEAD_LETTER_QUEUE = 'food-diary-import-dead-letter';

/** A finished preview is only needed until the client polls it, which takes seconds; an hour covers a dropped connection. */
const COMPLETED_RETENTION_SECONDS = 60 * 60;
const FAILED_RETENTION_SECONDS = 24 * 60 * 60;

export type FoodDiaryImportJob = Job<FoodDiaryImportJobData, FoodDiaryPreview>;

/** An import that failed every attempt for a reason other than the file, kept for an operator to inspect or replay. */
export interface DeadLetterEntry {
  jobId: string;
  data: FoodDiaryImportJobData;
  failure: ImportJobFailure;
  attemptsMade: number;
  failedAt: string;
}

let producerConnection: Redis | null = null;
let importQueue: Queue<FoodDiaryImportJobData, FoodDiaryPreview> | null = null;
let deadLetterQueue: Queue<DeadLetterEntry> | null = null;

/**
 * Opens the queue when Redis is configured. Called once at startup, so the
 * connection is ready before the first upload: the producer connection does
 * not queue commands while offline, so a cold one would reject the first job.
 */
export function openFoodDiaryImportQueue(): void {
  if (!isRedisConfigured() || importQueue) return;

  // Fail fast during an outage, so an upload falls back to the in-memory queue instead of hanging.
  producerConnection = createQueueConnection('producer', { enableOfflineQueue: false, maxRetriesPerRequest: 1 });
  const connection = producerConnection;
  const prefix = redisKeys.queuePrefix;

  importQueue = new Queue(FOOD_DIARY_IMPORT_QUEUE, {
    connection,
    prefix,
    defaultJobOptions: {
      attempts: IMPORT_RETRY_POLICY.attempts,
      backoff: { type: 'exponential', delay: IMPORT_RETRY_POLICY.backoffBaseMs },
      removeOnComplete: { age: COMPLETED_RETENTION_SECONDS },
      removeOnFail: { age: FAILED_RETENTION_SECONDS },
    },
  });
  deadLetterQueue = new Queue(DEAD_LETTER_QUEUE, { connection, prefix });

  // The connection already logs its own errors; without a listener, EventEmitter would throw them instead.
  importQueue.on('error', () => undefined);
  deadLetterQueue.on('error', () => undefined);
}

export function isFoodDiaryImportQueueReady(): boolean {
  return producerConnection?.status === 'ready';
}

/** Random ids, so one user cannot guess another's job id (ownership is still checked on every read). */
export async function enqueueFoodDiaryImport(data: FoodDiaryImportJobData): Promise<string> {
  if (!importQueue) throw new Error('The import queue is not open');
  const jobId = randomUUID();
  await importQueue.add('import', data, { jobId });
  return jobId;
}

export async function addToDeadLetterQueue(entry: DeadLetterEntry): Promise<void> {
  if (!deadLetterQueue) throw new Error('The dead-letter queue is not open');
  await deadLetterQueue.add('dead-letter', entry, { jobId: entry.jobId });
}

/** Dead letters are never processed, so they would otherwise sit in Redis forever. */
export async function pruneDeadLetters(olderThanMs: number): Promise<void> {
  await deadLetterQueue?.clean(olderThanMs, 1000, 'wait');
}

function isImportProgress(progress: unknown): progress is ImportJobProgress {
  return typeof progress === 'object' && progress !== null && 'stage' in progress && 'percent' in progress;
}

function toViewState(state: JobState | 'unknown', job: FoodDiaryImportJob): ImportJobState {
  if (state === 'completed' || state === 'failed') return state;
  if (state === 'active') return 'processing';
  // A job waits in "delayed" during its retry backoff.
  if (state === 'delayed' && job.attemptsMade > 0) return 'retrying';
  return 'queued';
}

function toJobView(jobId: string, job: FoodDiaryImportJob, state: JobState | 'unknown'): ImportJobView {
  const viewState = toViewState(state, job);
  const progress = isImportProgress(job.progress) ? job.progress : null;
  return {
    jobId,
    state: viewState,
    stage: progress?.stage ?? null,
    percent: viewState === 'completed' ? 100 : (progress?.percent ?? 0),
    attempt: job.attemptsStarted,
    maxAttempts: job.opts.attempts ?? IMPORT_RETRY_POLICY.attempts,
    result: viewState === 'completed' ? job.returnvalue : null,
    error: viewState === 'failed' ? decodeImportJobFailure(job.failedReason) : null,
  };
}

/** Another user's job is reported as missing, so a job id reveals nothing about whose it is. */
export async function findFoodDiaryImportJob(jobId: string, userId: string): Promise<ImportJobView | null> {
  if (!importQueue) return null;
  const job = await importQueue.getJob(jobId);
  if (!job || job.data.userId !== userId) return null;
  return toJobView(jobId, job, await job.getState());
}

export async function closeFoodDiaryImportQueue(): Promise<void> {
  await Promise.all([importQueue?.close(), deadLetterQueue?.close()]);
  // BullMQ leaves connections it was handed open, so they are closed here.
  await closeQueueConnection(producerConnection);
  importQueue = null;
  deadLetterQueue = null;
  producerConnection = null;
}
