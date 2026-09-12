"use client";

import Card from "@/components/ui/Card";
import DataPair from "@/components/ui/DataPair";
import { formatLongDate } from "@/lib/formatDate";
import { formatQuantity } from "./FoodEntryRow";
import type { FoodEntry } from "@/types/nutrition";

interface CreatedEntrySummaryProps {
  entry: FoodEntry;
}

/** Success state for the meal form: confirms exactly what was stored. */
export default function CreatedEntrySummary({ entry }: CreatedEntrySummaryProps) {
  const micronutrients = Object.entries(entry.micros ?? {});

  return (
    <Card className="space-y-8 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <p className="text-[10px] font-bold   text-text-primary dark:text-dark-text">
          Logged: {entry.mealType}
        </p>
        <p className="text-[10px] font-bold   text-text-secondary dark:text-dark-text-secondary">
          {formatLongDate(entry.date)}
        </p>
      </div>

      <div className="grid gap-8 grid-cols-2 sm:grid-cols-4">
        <DataPair label="Food" value={entry.foodName} />
        <DataPair label="Quantity" value={formatQuantity(entry.quantity, entry.quantityUnit)} />
        <DataPair label="Calories" value={`${entry.calories} kcal`} />
        <DataPair
          label="Protein / Carbs / Fat"
          value={`${entry.macros.proteinG} / ${entry.macros.carbG} / ${entry.macros.fatG} g`}
        />
      </div>

      {micronutrients.length > 0 && (
        <div className="pt-6 border-t border-black/10 dark:border-white/10">
          <p className="text-[10px] font-bold   text-text-secondary dark:text-dark-text-secondary">
            Micronutrients
          </p>
          <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {micronutrients.map(([name, data]) => (
              <DataPair
                key={name}
                label={name}
                value={`${data.amount} ${data.unit}`}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
