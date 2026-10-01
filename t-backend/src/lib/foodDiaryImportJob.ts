import { AppError } from '../middleware/errorHandler';
import type { FoodDiaryPreview } from '../services/foodDiaryPreview.service';

/** What a queued import carries: the PDF's text, already extracted, never the PDF itself. */
export interface FoodDiaryImportJobData {
  userId: string;
  diaryText: string;
  pageCount: number;
}

/** The AI passes an import goes through, in order. */
export const IMPORT_STAGES = ['reading', 'splitting', 'filling'] as const;
export type ImportStage = (typeof IMPORT_STAGES)[number];

/** Reading the diary is the long AI call, so it owns most of the bar. */
const STAGE_START_PERCENT: Record<ImportStage, number> = {
  reading: 10,
  splitting: 70,
  filling: 85,
};

export interface ImportJobProgress {
  stage: ImportStage;
  percent: number;
}

export function progressForStage(stage: ImportStage): ImportJobProgress {
  return { stage, percent: STAGE_START_PERCENT[stage] };
}

export type ReportImportStage = (stage: ImportStage) => Promise<void> | void;

/**
 * Each attempt already rotates keys and falls back across models inside its
 * own 80s budget, so a retry here is for an outage that outlasts that budget.
 * The backoff gives the provider time to recover instead of hammering it.
 */
export const IMPORT_RETRY_POLICY = {
  attempts: 3,
  backoffBaseMs: 5_000,
} as const;

/** Delay before retry number `attemptsMade` (1-based), doubling each time like BullMQ's exponential backoff. */
export function retryDelayMs(attemptsMade: number): number {
  return IMPORT_RETRY_POLICY.backoffBaseMs * 2 ** (attemptsMade - 1);
}

/** What the client sees when an import fails: the same `message` and `code` the synchronous route used to send. */
export interface ImportJobFailure {
  message: string;
  code: string;
  /** Whether the same file is worth sending again. Input problems are not; provider outages are. */
  retryable: boolean;
}

/** Provider outages and malformed model output can clear up on their own; everything else is about the file. */
const TRANSIENT_FAILURE_CODES = new Set(['AI_UNAVAILABLE', 'AI_BAD_RESPONSE', 'IMPORT_FAILED']);

const UNEXPECTED_FAILURE: ImportJobFailure = {
  message: 'The import failed unexpectedly. Try again.',
  code: 'IMPORT_FAILED',
  retryable: true,
};

/**
 * Turns whatever an import threw into the client-facing failure. An error that
 * is not an AppError is a bug or an infrastructure fault, so its details are
 * logged here and never sent to the client.
 */
export function toImportJobFailure(cause: unknown): ImportJobFailure {
  if (cause instanceof AppError) {
    const code = cause.code ?? 'IMPORT_FAILED';
    return { message: cause.message, code, retryable: TRANSIENT_FAILURE_CODES.has(code) };
  }
  console.error('[FoodDiaryImport] Unexpected failure:', cause);
  return UNEXPECTED_FAILURE;
}

/**
 * BullMQ persists only an error's message, so a failure travels through it as
 * JSON and is read back on the status endpoint.
 */
export function encodeImportJobFailure(failure: ImportJobFailure): string {
  return JSON.stringify(failure);
}

export function decodeImportJobFailure(failedReason: string | undefined): ImportJobFailure {
  if (!failedReason) return UNEXPECTED_FAILURE;
  try {
    const parsed = JSON.parse(failedReason) as Partial<ImportJobFailure>;
    if (typeof parsed.message !== 'string' || typeof parsed.code !== 'string') return UNEXPECTED_FAILURE;
    return { message: parsed.message, code: parsed.code, retryable: Boolean(parsed.retryable) };
  } catch {
    // A worker crash or a stalled-job failure leaves BullMQ's own message here, not ours.
    return UNEXPECTED_FAILURE;
  }
}

export type ImportJobState = 'queued' | 'processing' | 'retrying' | 'completed' | 'failed';

/** Returned by GET /api/food-entries/import/jobs/:jobId. */
export interface ImportJobView {
  jobId: string;
  state: ImportJobState;
  /** The pass running now, or the last one reached; null until the first pass starts. */
  stage: ImportStage | null;
  percent: number;
  /** 1-based attempt currently running, or the last one made. */
  attempt: number;
  maxAttempts: number;
  result: FoodDiaryPreview | null;
  error: ImportJobFailure | null;
}

export function notFoundImportJob(): AppError {
  return new AppError('This import was not found. It may have expired: upload the PDF again.', 404, 'IMPORT_JOB_NOT_FOUND');
}
