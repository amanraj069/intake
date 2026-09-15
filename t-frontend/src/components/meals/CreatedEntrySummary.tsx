"use client";

import Card from "@/components/ui/Card";
import DataPair from "@/components/ui/DataPair";
import { formatItemAmount } from "@/lib/foodItems";
import { formatLongDate, formatTime } from "@/lib/formatDate";
import type { FoodEntry } from "@/types/nutrition";

interface CreatedEntrySummaryProps {
  entry: FoodEntry;
}

/** Success state for the meal form: confirms exactly what was stored, item by item. */
export default function CreatedEntrySummary({ entry }: CreatedEntrySummaryProps) {
  const micronutrients = Object.entries(entry.micros ?? {});

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

      <ul className="divide-y divide-black/5 dark:divide-white/10">
        {entry.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 first:pt-0">
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text">
              {item.name}
              <span className="ml-2 font-light text-text-secondary dark:text-dark-text-secondary">
                {formatItemAmount(item)}
              </span>
            </p>
            <p className="text-xs tabular-nums text-text-secondary dark:text-dark-text-secondary">
              {item.calories} kcal · P {item.macros.proteinG} · C {item.macros.carbG} · F {item.macros.fatG} g
            </p>
          </li>
        ))}
      </ul>

      <div className="grid gap-8 grid-cols-2 sm:grid-cols-4 pt-6 border-t border-black/10 dark:border-white/10">
        <DataPair label="Total calories" value={`${entry.calories} kcal`} />
        <DataPair label="Protein" value={`${entry.macros.proteinG} g`} />
        <DataPair label="Carbs" value={`${entry.macros.carbG} g`} />
        <DataPair label="Fat" value={`${entry.macros.fatG} g`} />
      </div>

      {micronutrients.length > 0 && (
        <div className="pt-6 border-t border-black/10 dark:border-white/10">
          <p className="text-[10px] font-bold text-text-secondary dark:text-dark-text-secondary">Micronutrients</p>
          <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {micronutrients.map(([name, data]) => (
              <DataPair key={name} label={name} value={`${data.amount} ${data.unit}`} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
