"use client";

import { useState } from "react";
import type { ConfidenceLevel, FoodEntry } from "@/types/nutrition";
import { ConfidenceDetails, ConfidenceTrigger } from "./ConfidenceBreakdown";

const LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface AiLoggedNoticeProps {
  entry: FoodEntry;
}

/** On the edit page, how confident the photo reading behind an AI-logged entry was. */
export default function AiLoggedNotice({ entry }: AiLoggedNoticeProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const analysis = entry.extractionAnalysis;

  return (
    <div className="bg-white dark:bg-white/5 rounded-xl p-4 sm:p-5 space-y-1 border border-border dark:border-dark-border">
      <p className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary mb-2">Logged via AI</p>
      {analysis ? (
        <div>
          <ConfidenceTrigger confidence={analysis.confidence} open={showBreakdown} onToggle={() => setShowBreakdown(!showBreakdown)} />
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
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Confidence details unavailable.</p>
      )}
    </div>
  );
}
