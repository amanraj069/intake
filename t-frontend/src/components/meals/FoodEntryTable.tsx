"use client";

import FoodEntryRow, { ENTRY_GRID_COLUMNS } from "./FoodEntryRow";
import type { FoodEntry } from "@/types/nutrition";

const HEADINGS = ["Date", "Meal", "Food", "Calories", "Protein / Carbs / Fat", ""] as const;

interface FoodEntryTableProps {
  entries: FoodEntry[];
  /** The entry whose delete request is in flight, if any. */
  deletingId: string | null;
  onDelete: (entry: FoodEntry) => void;
}

/**
 * The entries list, drawn as a bordered grid on wide screens and as stacked
 * label-value rows below `lg`, where six columns cannot stay legible.
 */
export default function FoodEntryTable({ entries, deletingId, onDelete }: FoodEntryTableProps) {
  return (
    <div className="border border-black/10 dark:border-white/10 border-b-0">
      <div
        className={`hidden lg:grid ${ENTRY_GRID_COLUMNS} border-b border-black/10 dark:border-white/10 px-5 py-4`}
      >
        {HEADINGS.map((heading, index) => (
          <span
            key={heading || index}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary"
          >
            {heading}
          </span>
        ))}
      </div>

      {entries.map((entry) => (
        <FoodEntryRow
          key={entry._id}
          entry={entry}
          deleting={deletingId === entry._id}
          disabled={deletingId !== null}
          onDelete={() => onDelete(entry)}
        />
      ))}
    </div>
  );
}
