import { api, ApiError } from "./api";
import type { FoodDiaryImportJob } from "@/types/foodImport";

/** Even a six-minute wait stays well inside the general limit of 500 requests per 15 minutes. */
const POLL_INTERVAL_MS = 2000;
/** Covers the server's three attempts of up to 80s each, their backoff, and time queued behind other imports. */
const MAX_WAIT_MS = 6 * 60 * 1000;
/** A redeploy or a dropped connection should not fail an import that is still running on the server. */
const MAX_CONSECUTIVE_POLL_ERRORS = 3;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });
}

async function fetchJob(jobId: string, signal: AbortSignal): Promise<FoodDiaryImportJob> {
  const response = await api.getFoodDiaryImportJob(jobId, signal);
  if (!response.data) throw new ApiError("The server returned no import status.", 502, undefined, "AI_BAD_RESPONSE");
  return response.data;
}

/** Offline or a 5xx says nothing about the job itself; a 404 means it is gone. */
function isTransientPollError(cause: unknown): boolean {
  return cause instanceof ApiError && (cause.status === 0 || cause.status >= 500);
}

/**
 * Polls an import job until it completes or fails, reporting every update so
 * the UI can show the stage it is on. Rejects when `signal` aborts.
 */
export async function waitForImportJob(
  jobId: string,
  signal: AbortSignal,
  onUpdate: (job: FoodDiaryImportJob) => void
): Promise<FoodDiaryImportJob> {
  const deadline = Date.now() + MAX_WAIT_MS;
  let consecutiveErrors = 0;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS, signal);
    try {
      const job = await fetchJob(jobId, signal);
      consecutiveErrors = 0;
      onUpdate(job);
      if (job.state === "completed" || job.state === "failed") return job;
    } catch (cause) {
      consecutiveErrors += 1;
      if (signal.aborted || !isTransientPollError(cause) || consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
        throw cause;
      }
    }
  }

  throw new ApiError("Reading this diary is taking too long. Try again in a few minutes.", 504, undefined, "IMPORT_TIMED_OUT");
}
