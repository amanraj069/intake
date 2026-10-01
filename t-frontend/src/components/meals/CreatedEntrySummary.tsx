"use client";

import Card from "@/components/ui/Card";
import DataPair from "@/components/ui/DataPair";
import { formatLongDate, formatTime } from "@/lib/formatDate";
import type { FoodEntry } from "@/types/nutrition";
import MealItemList from "./MealItemList";
import MicronutrientSummary from "./MicronutrientSummary";

interface CreatedEntrySummaryProps {
  entry: FoodEntry;
}

/** Success state for the meal form: confirms exactly what was stored, item by item. */
export default function CreatedEntrySummary({ entry }: CreatedEntrySummaryProps) {
  return (
    <Card className="bg-bg-card dark:bg-dark-bg-card space-y-4 sm:space-y-8 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <p className="text-[10px] font-bold text-text-primary dark:text-dark-text capitalize">Logged: {entry.mealType}</p>
        <p className="text-[10px] font-bold text-text-secondary dark:text-dark-text-secondary">
          {formatLongDate(entry.date)}
          {entry.time && (
            <span className="ml-1.5 font-normal text-text-secondary/80 dark:text-dark-text-secondary/80">
              · {formatTime(entry.time)}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3.5">
        {entry.imageUrl && (
          <img
            src={entry.imageUrl}
            alt={entry.name}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-black/10 dark:border-white/10 shrink-0 shadow-xs"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-text-primary dark:text-dark-text truncate">{entry.name}</h2>
          {entry.source === "ai-image" && (
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
              Logged via AI photo
            </p>
          )}
        </div>
      </div>

      <MealItemList items={entry.items} />

      <div className="grid gap-8 grid-cols-2 sm:grid-cols-4 pt-6 border-t border-black/10 dark:border-white/10">
        <DataPair label="Total calories" value={`${entry.calories} kcal`} />
        <DataPair label="Protein" value={`${entry.macros.proteinG} g`} />
        <DataPair label="Carbs" value={`${entry.macros.carbG} g`} />
        <DataPair label="Fat" value={`${entry.macros.fatG} g`} />
      </div>

      <MicronutrientSummary micros={entry.micros} />
    </Card>
  );
}
