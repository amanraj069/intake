"use client";

import { useState } from "react";
import Meter from "@/components/ui/Meter";
import type { ConfidenceLevel, ExtractionConfidence } from "@/types/nutrition";

const LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function BreakdownHeading({ children }: { children: string }) {
  return <p className="text-xs font-bold text-text-primary dark:text-dark-text">{children}</p>;
}

export function ConfidenceTrigger({
  confidence,
  open,
  onToggle,
}: {
  confidence: ExtractionConfidence;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <p className="text-sm text-text-primary dark:text-dark-text">
        <span className="font-bold">{confidence.score}%</span>
        <span className="font-light text-text-secondary dark:text-dark-text-secondary">
          {" "}
          confidence · {LEVEL_LABELS[confidence.level]}
        </span>
      </p>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="text-xs font-semibold text-text-secondary underline-offset-4 transition-colors duration-150 hover:text-text-primary hover:underline dark:text-dark-text-secondary dark:hover:text-dark-text cursor-pointer"
      >
        {open ? "Hide breakdown" : "Why?"}
      </button>
    </div>
  );
}

export function ConfidenceDetails({ confidence }: { confidence: ExtractionConfidence }) {
  return (
    <div className="space-y-5 rounded-xl bg-bg-app dark:bg-dark-bg-app p-4">
      <div className="space-y-2">
        <BreakdownHeading>{`How ${LEVEL_LABELS[confidence.level]} was reached`}</BreakdownHeading>
        <ol className="space-y-1">
          {confidence.levelSteps.map((step, index) => (
            <li
              key={step}
              className="flex gap-2 text-xs font-light text-text-secondary dark:text-dark-text-secondary"
            >
              <span className="font-semibold tabular-nums text-text-primary dark:text-dark-text">
                {index + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-3 border-t border-black/5 pt-4 dark:border-white/10">
        <BreakdownHeading>{`What makes up ${confidence.score}%`}</BreakdownHeading>
        <ul className="grid gap-4 sm:grid-cols-2">
          {confidence.factors.map((factor) => (
            <li key={factor.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-semibold text-text-primary dark:text-dark-text">
                  {factor.label}
                </span>
                <span className="font-bold tabular-nums text-text-primary dark:text-dark-text">
                  {factor.score}
                  <span className="font-light text-text-secondary dark:text-dark-text-secondary">
                    {" "}
                    · weight {Math.round(factor.weight * 100)}%
                  </span>
                </span>
              </div>
              <Meter percent={factor.score} ariaLabel={`${factor.label}: ${factor.score} out of 100`} />
              <p className="text-xs font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
                {factor.reason}
              </p>
            </li>
          ))}
        </ul>

        {confidence.adjustments.length > 0 && (
          <ul className="space-y-1 border-t border-black/5 pt-3 dark:border-white/10">
            {confidence.adjustments.map((adjustment) => (
              <li
                key={adjustment}
                className="text-xs font-light text-text-secondary dark:text-dark-text-secondary"
              >
                {adjustment}
              </li>
            ))}
          </ul>
        )}

        <p className="text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">
          The overall score blends the weighted factors with the weakest one, so a single unknown always
          lowers it. It never exceeds 95%.
        </p>
      </div>
    </div>
  );
}
