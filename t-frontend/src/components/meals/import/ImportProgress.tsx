"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { DocumentIcon } from "@/components/icons";

/** Rough milestones of a typical parse, so a long wait never looks frozen. */
const STAGES: readonly { afterSeconds: number; message: string }[] = [
  { afterSeconds: 0, message: "Uploading and reading the PDF" },
  { afterSeconds: 3, message: "Finding each food entry" },
  { afterSeconds: 10, message: "Reading dates, meals, calories and macros" },
  { afterSeconds: 30, message: "Still working. Long diaries take a little longer." },
];

function stageFor(elapsedSeconds: number): string {
  return STAGES.filter((stage) => elapsedSeconds >= stage.afterSeconds).at(-1)?.message ?? STAGES[0].message;
}

interface ImportProgressProps {
  fileName: string;
  onCancel: () => void;
}

export default function ImportProgress({ fileName, onCancel }: ImportProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 rounded-2xl bg-bg-card dark:bg-dark-bg-card border border-black/5 dark:border-white/10 shadow-sm p-5 sm:p-6"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bg-app dark:bg-dark-bg-app text-text-secondary dark:text-dark-text-secondary animate-pulse">
        <DocumentIcon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="truncate text-base font-bold text-text-primary dark:text-dark-text pr-16">Parsing {fileName}</p>
          <p className="mt-1 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
            {stageFor(elapsedSeconds)}
          </p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div className="h-full w-1/3 rounded-full bg-accent dark:bg-accent-dark animate-photo-progress" />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="absolute top-4 right-4 sm:top-5 sm:right-5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
      >
        Cancel
      </Button>
    </div>
  );
}
