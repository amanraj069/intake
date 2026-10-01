import { FoodDiaryImportJobData, ImportJobView, notFoundImportJob } from '../lib/foodDiaryImportJob';
import { isRedisConfigured } from '../lib/redis';
import { AppError } from '../middleware/errorHandler';
import {
  enqueueFoodDiaryImport,
  findFoodDiaryImportJob,
  isFoodDiaryImportQueueReady,
} from '../queues/foodDiaryImport.queue';
import { processFoodDiaryImport } from '../queues/importJobProcessor';
import { readImportQueueSettings } from '../queues/importQueueSettings';
import { MemoryImportJobs } from '../queues/memoryImportJobs';
import { readFoodDiaryText } from './foodDiaryPreview.service';

const memoryJobs = new MemoryImportJobs({
  process: processFoodDiaryImport,
  concurrency: readImportQueueSettings().concurrency,
});

/** Redis is optional, so an import must still run when the queue cannot take it. */
async function enqueue(data: FoodDiaryImportJobData): Promise<string> {
  if (!isFoodDiaryImportQueueReady()) return memoryJobs.enqueue(data);
  try {
    return await enqueueFoodDiaryImport(data);
  } catch (error) {
    console.warn('[FoodDiaryImport] Queue rejected the job, running it in memory:', (error as Error).message);
    return memoryJobs.enqueue(data);
  }
}

/**
 * Reads the PDF's text now, so a bad file is rejected in the upload's own
 * response, then queues the AI passes and returns the job to poll.
 *
 * @throws AppError PDF_UNREADABLE, PDF_ENCRYPTED, PDF_TOO_LONG or PDF_NO_TEXT.
 */
export async function startFoodDiaryImport(userId: string, pdfBytes: Buffer): Promise<{ jobId: string }> {
  const diary = await readFoodDiaryText(pdfBytes);
  const jobId = await enqueue({ userId, diaryText: diary.text, pageCount: diary.pageCount });
  return { jobId };
}

async function findQueuedJob(jobId: string, userId: string): Promise<ImportJobView | null> {
  try {
    return await findFoodDiaryImportJob(jobId, userId);
  } catch (error) {
    console.error('[FoodDiaryImport] Could not read job status from Redis:', (error as Error).message);
    throw new AppError('Import status is unavailable right now. Try again in a moment.', 503, 'IMPORT_STATUS_UNAVAILABLE');
  }
}

/**
 * A job's state, progress and, once finished, its preview or failure.
 *
 * @throws AppError IMPORT_JOB_NOT_FOUND for an unknown, expired or other user's job.
 */
export async function getFoodDiaryImportJob(userId: string, jobId: string): Promise<ImportJobView> {
  const inMemory = memoryJobs.find(jobId, userId);
  if (inMemory) return inMemory;
  if (!isRedisConfigured()) throw notFoundImportJob();

  const queued = await findQueuedJob(jobId, userId);
  if (!queued) throw notFoundImportJob();
  return queued;
}
