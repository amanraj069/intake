"use client";

import { formatMicroAmount } from "@/lib/formatNumber";
import type { Micronutrients } from "@/types/nutrition";
import DetailSection from "./DetailSection";

function sentenceCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * The meal's micronutrient totals; renders nothing when none were tracked.
 * On phones each is a compact label-left, value-right tile like the
 * dashboard's metric tiles; from `sm` up the value sits under its label.
 */
export default function MicronutrientGrid({ micros }: { micros?: Micronutrients }) {
  const nutrients = Object.entries(micros ?? {});
  if (nutrients.length === 0) return null;

  return (
    <DetailSection title="Micronutrients" description="Vitamins and minerals across every dish">
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {nutrients.map(([name, { amount, unit }]) => (
          <div
            key={name}
            className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-bg-surface dark:bg-dark-surface px-2.5 py-2 sm:block sm:px-4 sm:py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
          >
            <dt className="min-w-0 truncate text-[11px] sm:text-xs font-light text-text-secondary dark:text-dark-text-secondary">
              {sentenceCase(name)}
            </dt>
            <dd className="shrink-0 whitespace-nowrap text-xs sm:mt-1 sm:text-lg font-semibold sm:font-bold tabular-nums text-text-primary dark:text-dark-text">
              {formatMicroAmount(amount)}
              <span className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </DetailSection>
  );
}
