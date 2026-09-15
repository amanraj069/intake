"use client";

import { useState } from "react";
import type { ConfidenceLevel, FoodEntry } from "@/types/nutrition";
import { ConfidenceDetails, ConfidenceTrigger } from "./ConfidenceBreakdown";
import { CloseIcon, PhotoUploadIcon } from "@/components/icons";

const LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface AiLoggedNoticeProps {
  entry: FoodEntry;
}

/** On the edit page, shows the meal photo on the left and confidence/analysis on the right. */
export default function AiLoggedNotice({ entry }: AiLoggedNoticeProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const analysis = entry.extractionAnalysis;
  const hasImage = Boolean(entry.imageUrl);

  return (
    <>
      <div className="bg-white dark:bg-dark-bg-card rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-xs flex flex-col sm:flex-row items-stretch">
        {hasImage && (
          <div className="relative w-full sm:w-48 md:w-56 shrink-0 bg-black/5 dark:bg-white/5 self-stretch overflow-hidden group min-h-[160px] sm:min-h-full border-b sm:border-b-0 sm:border-r border-black/5 dark:border-white/10">
            <img
              src={entry.imageUrl}
              alt={entry.name || "Logged meal photo"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
              onClick={() => setLightboxOpen(true)}
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="View photo full size"
              className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white font-medium text-xs gap-1.5 backdrop-blur-[2px] cursor-pointer"
            >
              <PhotoUploadIcon className="w-4 h-4" />
              <span>View photo</span>
            </button>
          </div>
        )}

        <div className="p-4 sm:p-5 flex-1 min-w-0 flex flex-col justify-center space-y-1">
          <p className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary mb-2">
            Logged via AI
          </p>
          {analysis ? (
            <div>
              <ConfidenceTrigger
                confidence={analysis.confidence}
                open={showBreakdown}
                onToggle={() => setShowBreakdown(!showBreakdown)}
              />
              {showBreakdown && (
                <div className="mt-4">
                  <ConfidenceDetails confidence={analysis.confidence} />
                </div>
              )}
              {analysis.notes && (
                <p className="mt-4 text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary border-t border-black/5 dark:border-white/10 pt-4">
                  <span className="font-semibold text-text-primary dark:text-dark-text mr-1">Note:</span>
                  {analysis.notes}
                </p>
              )}
            </div>
          ) : entry.confidenceLevel && entry.confidenceScore !== undefined ? (
            <p className="text-sm text-text-primary dark:text-dark-text">
              <span className="font-bold">{entry.confidenceScore}%</span>
              <span className="font-light text-text-secondary dark:text-dark-text-secondary">
                {" "}
                confidence · {LEVEL_LABELS[entry.confidenceLevel]}
              </span>
            </p>
          ) : (
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Confidence details unavailable.
            </p>
          )}
        </div>
      </div>

      {/* Lightbox modal for previewing the uploaded meal photo */}
      {lightboxOpen && entry.imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close photo view"
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <img
              src={entry.imageUrl}
              alt={entry.name || "Logged meal photo"}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            {entry.name && (
              <p className="mt-3 text-sm font-medium text-white/90 text-center">
                {entry.name}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

