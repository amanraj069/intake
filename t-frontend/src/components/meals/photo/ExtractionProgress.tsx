"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import PhotoThumbnail from "./PhotoThumbnail";

/** Rough milestones of a typical analysis, so a 20 second wait never looks frozen. */
const STAGES: readonly { afterSeconds: number; message: string }[] = [
  { afterSeconds: 0, message: "Uploading your photo" },
  { afterSeconds: 2, message: "Identifying the food" },
  { afterSeconds: 7, message: "Estimating the portion and nutrients" },
  { afterSeconds: 18, message: "Still working. Busy plates take a little longer." },
];

function stageFor(elapsedSeconds: number): string {
  return STAGES.filter((stage) => elapsedSeconds >= stage.afterSeconds).at(-1)?.message ?? STAGES[0].message;
}

interface ExtractionProgressProps {
  previewUrl: string | null;
  onCancel: () => void;
}

export default function ExtractionProgress({ previewUrl, onCancel }: ExtractionProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative flex items-center gap-4 sm:gap-5" role="status" aria-live="polite">
      <PhotoThumbnail src={previewUrl} busy />

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="text-base font-bold text-text-primary dark:text-dark-text pr-16">Reading your photo</p>
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
        className="absolute top-0 right-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
      >
        Cancel
      </Button>
    </div>
  );
}
