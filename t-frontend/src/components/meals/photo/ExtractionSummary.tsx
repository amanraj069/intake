"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { AlertIcon } from "@/components/icons";
import type { ExtractionAnalysis } from "@/types/nutrition";
import { ConfidenceTrigger, ConfidenceDetails } from "./ConfidenceBreakdown";
import PhotoThumbnail from "./PhotoThumbnail";

interface ExtractionSummaryProps {
  previewUrl: string | null;
  analysis: ExtractionAnalysis;
  onChooseAnother: () => void;
  onDiscard: () => void;
}

/** Shown once a draft fills the form: how it was read, and what deserves a second look. */
export default function ExtractionSummary({
  previewUrl,
  analysis,
  onChooseAnother,
  onDiscard,
}: ExtractionSummaryProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
      <PhotoThumbnail src={previewUrl} />

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-base font-bold text-text-primary dark:text-dark-text">
              Draft filled in. Review it below.
            </p>
            <div className="hidden sm:block h-4 w-px bg-black/10 dark:bg-white/10" />
            <ConfidenceTrigger
              confidence={analysis.confidence}
              open={breakdownOpen}
              onToggle={() => setBreakdownOpen((o) => !o)}
            />
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button type="button" variant="secondary" size="sm" onClick={onChooseAnother}>
              Use another photo
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
              Discard draft
            </Button>
          </div>
        </div>

        {breakdownOpen && <ConfidenceDetails confidence={analysis.confidence} />}

        {analysis.notes && (
          <p className="text-sm font-light leading-relaxed text-text-primary dark:text-dark-text">
            {analysis.notes}
          </p>
        )}

        {analysis.warnings.length > 0 && (
          <ul className="space-y-1.5">
            {analysis.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-sm text-text-primary dark:text-dark-text">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="font-light">{warning}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
