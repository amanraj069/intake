const DEFAULT_CONCURRENCY = 2;
const DEFAULT_JOBS_PER_MINUTE = 10;

export interface ImportQueueSettings {
  /** Imports one worker process runs at the same time. */
  concurrency: number;
  /** Imports started per minute across every worker, so a burst of uploads cannot exhaust the Gemini quota. */
  jobsPerMinute: number;
}

function positiveIntegerFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (Number.isInteger(value) && value > 0) return value;
  console.warn(`[ImportQueue] ${name}="${raw}" is not a positive integer, using ${fallback}`);
  return fallback;
}

export function readImportQueueSettings(): ImportQueueSettings {
  return {
    concurrency: positiveIntegerFromEnv('IMPORT_WORKER_CONCURRENCY', DEFAULT_CONCURRENCY),
    jobsPerMinute: positiveIntegerFromEnv('IMPORT_JOBS_PER_MINUTE', DEFAULT_JOBS_PER_MINUTE),
  };
}

/** The worker runs inside the API process unless it is moved to its own process with `npm run worker`. */
export function shouldRunWorkerInApi(): boolean {
  return process.env.IMPORT_WORKER_IN_API?.trim().toLowerCase() !== 'false';
}
