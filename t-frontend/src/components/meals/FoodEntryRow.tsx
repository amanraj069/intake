"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { formatShortDate } from "@/lib/formatDate";
import type { FoodEntry } from "@/types/nutrition";

/**
 * Column track shared by the header and every row, so the two stay aligned.
 * Below `lg` the tracks collapse and each cell carries its own label instead.
 */
export const ENTRY_GRID_COLUMNS =
  "gap-x-6 gap-y-4 lg:grid-cols-[7rem_6rem_minmax(0,1fr)_6rem_9rem_8rem] lg:items-center";

const ACTION_CLASSES = [
  "px-3 py-1.5 border border-black/10 dark:border-white/10",
  "text-[10px] font-bold uppercase tracking-[0.2em]",
  "transition-colors duration-100 cursor-pointer",
  "disabled:opacity-40 disabled:cursor-not-allowed",
].join(" ");

const EDIT_CLASSES = [
  ACTION_CLASSES,
  "text-text-primary dark:text-dark-text",
  "hover:bg-text-primary hover:text-bg-primary hover:border-text-primary",
  "dark:hover:bg-dark-text dark:hover:text-dark-bg dark:hover:border-dark-text",
].join(" ");

const DELETE_CLASSES = [
  ACTION_CLASSES,
  "text-error dark:text-error-dark",
  "hover:bg-error hover:text-white hover:border-error",
  "dark:hover:bg-error-dark dark:hover:border-error-dark",
  "disabled:hover:bg-transparent disabled:hover:text-error",
].join(" ");

/** Turns a cell into a label-value pair on small screens, where the header is hidden. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 lg:block">
      <span className="lg:hidden text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary">
        {label}
      </span>
      {children}
    </div>
  );
}

interface FoodEntryRowProps {
  entry: FoodEntry;
  /** True while this row's own delete request is in flight. */
  deleting: boolean;
  disabled: boolean;
  onDelete: () => void;
}

export default function FoodEntryRow({ entry, deleting, disabled, onDelete }: FoodEntryRowProps) {
  const { proteinG, carbG, fatG } = entry.macros;

  return (
    <article
      className={`grid ${ENTRY_GRID_COLUMNS} border-b border-black/10 dark:border-white/10 px-5 py-5 lg:py-4 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]`}
    >
      <Cell label="Date">
        <p className="text-xs font-medium uppercase tracking-widest text-text-secondary dark:text-dark-text-secondary">
          {formatShortDate(entry.date)}
        </p>
      </Cell>

      <Cell label="Meal">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary dark:text-dark-text">
          {entry.mealType}
        </p>
      </Cell>

      <Cell label="Food">
        <div className="text-right lg:text-left min-w-0">
          <p className="text-sm font-medium text-text-primary dark:text-dark-text truncate">
            {entry.foodName}
          </p>
          <p className="text-xs font-light text-text-secondary dark:text-dark-text-secondary">
            {entry.quantity} {entry.quantityUnit}
          </p>
        </div>
      </Cell>

      <Cell label="Calories">
        <p className="text-sm font-medium text-text-primary dark:text-dark-text whitespace-nowrap">
          {entry.calories} kcal
        </p>
      </Cell>

      <Cell label="Protein / Carbs / Fat">
        <p className="text-sm font-light text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
          {proteinG} / {carbG} / {fatG} g
        </p>
      </Cell>

      <div className="flex items-center gap-2 lg:justify-end pt-2 lg:pt-0">
        <Link href={`/meals/${entry._id}/edit`} className={EDIT_CLASSES}>
          Edit
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className={DELETE_CLASSES}
          aria-label={`Delete ${entry.foodName}`}
        >
          {deleting ? "..." : "Delete"}
        </button>
      </div>
    </article>
  );
}
