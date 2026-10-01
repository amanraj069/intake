"use client";

import DataPair from "@/components/ui/DataPair";
import type { Micronutrients } from "@/types/nutrition";

/** A meal's micronutrient totals as label-value pairs; renders nothing when none were tracked. */
export default function MicronutrientSummary({ micros }: { micros?: Micronutrients }) {
  const micronutrients = Object.entries(micros ?? {});
  if (micronutrients.length === 0) return null;

  return (
    <div className="pt-6 border-t border-black/10 dark:border-white/10">
      <p className="text-[10px] font-bold text-text-secondary dark:text-dark-text-secondary">Micronutrients</p>
      <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {micronutrients.map(([name, data]) => (
          <DataPair key={name} label={name} value={`${data.amount} ${data.unit}`} />
        ))}
      </div>
    </div>
  );
}
