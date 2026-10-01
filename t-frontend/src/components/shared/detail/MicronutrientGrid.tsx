"use client";

import { formatMicroAmount } from "@/lib/formatNumber";
import type { Micronutrients } from "@/types/nutrition";
import DetailSection from "./DetailSection";

function sentenceCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** The meal's micronutrient totals as compact tiles; renders nothing when none were tracked. */
export default function MicronutrientGrid({ micros }: { micros?: Micronutrients }) {
  const nutrients = Object.entries(micros ?? {});
  if (nutrients.length === 0) return null;

  return (
    <DetailSection title="Micronutrients" description="Vitamins and minerals across every dish">
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {nutrients.map(([name, { amount, unit }]) => (
          <div key={name} className="rounded-xl bg-bg-surface dark:bg-dark-surface px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
            <dt className="truncate text-xs font-light text-text-secondary dark:text-dark-text-secondary">{sentenceCase(name)}</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-text-primary dark:text-dark-text">
              {formatMicroAmount(amount)}
              <span className="ml-1 text-xs font-medium text-text-secondary dark:text-dark-text-secondary">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </DetailSection>
  );
}
