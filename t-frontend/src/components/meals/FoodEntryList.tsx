"use client";

import type { FoodEntry } from "@/types/nutrition";
import FoodEntryRow, { ENTRY_GRID_CLASSES } from "./FoodEntryRow";

interface FoodEntryListProps {
  entries: FoodEntry[];
  deletingId: string | null;
  onDelete: (entry: FoodEntry) => void;
  onRowClick: (entry: FoodEntry) => void;
}

/**
 * The entries table, with clear column headings including Date.
 */
export default function FoodEntryList({ entries, deletingId, onDelete, onRowClick }: FoodEntryListProps) {
  return (
    <div className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm border-0">
      <div className="overflow-x-auto lg:overflow-visible">
        <div className="min-w-[840px] lg:min-w-0 pb-16 lg:pb-12">
          {/* Table Column Headings */}
          <div
            className={`${ENTRY_GRID_CLASSES} px-5 sm:px-6 py-3.5 border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-text-secondary dark:text-dark-text-secondary select-none`}
          >
            <div>Date</div>
            <div>Meal</div>
            <div>Food</div>
            <div>Serving</div>
            <div>Protein</div>
            <div>Carbs</div>
            <div>Fat</div>
            <div className="text-right">Calories</div>
            <div className="text-right sr-only">Actions</div>
          </div>

          <div>
            {entries.map((entry) => (
              <FoodEntryRow
                key={entry._id}
                entry={entry}
                deleting={deletingId === entry._id}
                disabled={deletingId !== null}
                onDelete={() => onDelete(entry)}
                onClick={() => onRowClick(entry)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
