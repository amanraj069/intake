"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import {
  IMPORT_STEP_COUNT,
  formatElapsed,
  importStatusLabel,
  importStepsFor,
  retryNote,
} from "@/lib/importProgressSteps";
import type { FoodDiaryImportJob } from "@/types/foodImport";
import ImportStepRow from "./ImportStepRow";

function useElapsedSeconds(): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return elapsedSeconds;
}

interface ImportProgressProps {
  fileName: string;
  job: FoodDiaryImportJob | null;
  onCancel: () => void;
}

/** Follows a queued import step by step, so a long parse always shows what is happening. */
export default function ImportProgress({ fileName, job, onCancel }: ImportProgressProps) {
  const elapsedSeconds = useElapsedSeconds();
  const { steps, completedCount } = importStepsFor(job);
  const activeStep = steps.find((step) => step.status === "active");
  const percent = (completedCount / IMPORT_STEP_COUNT) * 100;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl bg-bg-card dark:bg-dark-bg-card border border-black/5 dark:border-white/10 shadow-sm px-4 py-6 sm:px-8 sm:py-10"
    >
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <span className="rounded-full bg-bg-app dark:bg-dark-bg-app px-2.5 py-1 text-xs font-medium text-text-secondary dark:text-dark-text-secondary">
          {importStatusLabel(job)}
        </span>
        <h2 className="mt-3 sm:mt-4 text-lg sm:text-xl font-bold text-text-primary dark:text-dark-text">Reading your food diary</h2>
        <p className="mt-1 max-w-full text-balance break-words text-[13px] leading-snug sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">
          {activeStep ? `Now running: ${activeStep.label}` : fileName}
        </p>
      </div>

      <div className="mx-auto mt-6 sm:mt-8 max-w-md">
        <div className="flex items-baseline justify-between gap-3 text-[13px] sm:text-sm">
          <span className="font-medium text-text-primary dark:text-dark-text">
            {completedCount} of {IMPORT_STEP_COUNT} steps done
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs font-light tabular-nums text-text-secondary dark:text-dark-text-secondary">
            {formatElapsed(elapsedSeconds)} elapsed
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div
            className="h-full rounded-full bg-accent dark:bg-accent-dark transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="mt-4 sm:mt-5 space-y-1 text-left">
          {steps.map((step) => (
            <ImportStepRow key={step.key} step={step} note={step.status === "active" ? retryNote(job) : null} />
          ))}
        </ul>

        <p className="mt-4 sm:mt-5 truncate text-center text-xs font-light text-text-secondary dark:text-dark-text-secondary">{fileName}</p>
        <div className="mt-2 sm:mt-3 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="w-full sm:w-auto min-h-11 sm:min-h-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          >
            Cancel import
          </Button>
        </div>
      </div>
    </div>
  );
}
