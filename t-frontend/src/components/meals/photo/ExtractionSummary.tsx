"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { AlertIcon, CameraIcon, TrashIcon } from "@/components/icons";
import type { ExtractionAnalysis } from "@/types/nutrition";
import { ConfidenceTrigger, ConfidenceDetails, LEVEL_LABELS } from "./ConfidenceBreakdown";
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

  const discardButton = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onDiscard}
      className="!h-8 !px-2.5 sm:!px-3 !text-xs whitespace-nowrap inline-flex items-center gap-1.5 !text-error dark:!text-error-dark hover:!text-red-700 dark:hover:!text-red-400"
    >
      <TrashIcon className="h-3.5 w-3.5 text-error dark:text-error-dark shrink-0" />
      <span>Discard</span>
    </Button>
  );

  const chooseAnotherButton = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onChooseAnother}
      className="!h-8 !px-2.5 sm:!px-3 !text-xs whitespace-nowrap inline-flex items-center gap-1.5"
    >
      <CameraIcon className="h-3.5 w-3.5 shrink-0 text-text-secondary dark:text-dark-text-secondary" />
      <span>Use another photo</span>
    </Button>
  );

  return (
    <div className="space-y-4 sm:space-y-3">
      {/* Top row */}
      <div className="flex items-start gap-3.5 sm:gap-5">
        {/* Photo thumbnail */}
        <PhotoThumbnail src={previewUrl} />

        {/* Right column on mobile / Main content on desktop */}
        <div className="min-w-0 flex-1 sm:block space-y-2 sm:space-y-3">
          {/* Mobile right column: Title + buttons with proper upper spacing */}
          <div className="sm:hidden flex flex-col justify-start">
            <p className="text-sm font-bold text-text-primary dark:text-dark-text leading-snug pt-0.5">
              Draft filled in. Review it below.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-3.5">
              {chooseAnotherButton}
              {discardButton}
            </div>
          </div>

          {/* Desktop header row: Title + divider + ConfidenceTrigger + buttons */}
          <div className="hidden sm:flex sm:flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-base font-bold text-text-primary dark:text-dark-text">
                Draft filled in. Review it below.
              </p>
              <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
              <ConfidenceTrigger
                confidence={analysis.confidence}
                open={breakdownOpen}
                onToggle={() => setBreakdownOpen((o) => !o)}
              />
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {chooseAnotherButton}
              {discardButton}
            </div>
          </div>

          {/* Desktop notes & warnings */}
          <div className="hidden sm:block space-y-2">
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
      </div>

      {/* Mobile-only confidence trigger directly below the image in ONE line */}
      <div className="sm:hidden !mt-1.5 pb-0.5">
        <button
          type="button"
          onClick={() => setBreakdownOpen((o) => !o)}
          aria-expanded={breakdownOpen}
          className="inline-flex items-center gap-1.5 text-left cursor-pointer group whitespace-nowrap text-xs"
        >
          <span className="font-bold text-text-primary dark:text-dark-text">
            {analysis.confidence.score}%
          </span>
          <span className="font-light text-text-secondary dark:text-dark-text-secondary">
            confidence · {LEVEL_LABELS[analysis.confidence.level]}
          </span>
          <span className="font-semibold text-text-secondary dark:text-dark-text-secondary underline underline-offset-2 group-hover:text-text-primary dark:group-hover:text-dark-text ml-1">
            {breakdownOpen ? "Hide breakdown" : "Why?"}
          </span>
        </button>
      </div>

      {/* Confidence Breakdown details (when expanded) */}
      {breakdownOpen && <ConfidenceDetails confidence={analysis.confidence} />}

      {/* Mobile notes & warnings (full width below top section) */}
      <div className="sm:hidden space-y-2.5 !mt-3 pt-3 border-t border-black/5 dark:border-white/5">
        {analysis.notes && (
          <p className="text-xs font-light leading-relaxed text-text-primary dark:text-dark-text">
            {analysis.notes}
          </p>
        )}

        {analysis.warnings.length > 0 && (
          <ul className="space-y-2">
            {analysis.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-xs text-text-primary dark:text-dark-text">
                <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="font-light leading-relaxed">{warning}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
