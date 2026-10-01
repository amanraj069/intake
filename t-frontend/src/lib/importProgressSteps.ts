import type { FoodDiaryImportJob, ImportStage } from "@/types/foodImport";

export type ImportStepKey = "upload" | "queue" | ImportStage;
export type ImportStepStatus = "done" | "active" | "pending";

export interface ImportStep {
  key: ImportStepKey;
  label: string;
  status: ImportStepStatus;
}

const STEP_LABELS: readonly { key: ImportStepKey; label: string }[] = [
  { key: "upload", label: "Upload and check the PDF" },
  { key: "queue", label: "Wait for a free slot" },
  { key: "reading", label: "Read dates, meals, calories and macros" },
  { key: "splitting", label: "Separate dishes listed together" },
  { key: "filling", label: "Estimate nutrition the diary left out" },
];

export const IMPORT_STEP_COUNT = STEP_LABELS.length;

/**
 * Index of the step running now; equal to the step count once the job is done.
 * A job that has left the queue but not reported a pass yet is about to start reading.
 */
function activeStepIndex(job: FoodDiaryImportJob | null): number {
  if (!job) return 0;
  if (job.state === "completed") return STEP_LABELS.length;
  if (job.state === "queued") return 1;
  const stage = job.stage ?? "reading";
  return STEP_LABELS.findIndex((step) => step.key === stage);
}

/** Every step of an import with whether it is done, running or still to come. */
export function importStepsFor(job: FoodDiaryImportJob | null): { steps: ImportStep[]; completedCount: number } {
  const activeIndex = activeStepIndex(job);
  const steps = STEP_LABELS.map((step, index) => ({
    ...step,
    status: (index < activeIndex ? "done" : index === activeIndex ? "active" : "pending") as ImportStepStatus,
  }));
  return { steps, completedCount: Math.min(activeIndex, STEP_LABELS.length) };
}

/** The short state shown in the card's pill. */
export function importStatusLabel(job: FoodDiaryImportJob | null): string {
  if (!job) return "Uploading";
  if (job.state === "queued") return "Queued";
  if (job.state === "retrying") return "Retrying";
  return "Processing";
}

/** "45s" under a minute, "2m 05s" after, so a long wait stays short enough for a phone row. */
export function formatElapsed(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}m ${seconds}s`;
}

/** Shown under the active step while the server waits out its backoff before another attempt. */
export function retryNote(job: FoodDiaryImportJob | null): string | null {
  if (job?.state !== "retrying") return null;
  return `AI service busy. Retrying, attempt ${job.attempt + 1} of ${job.maxAttempts}`;
}
