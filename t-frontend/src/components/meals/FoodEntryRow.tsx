"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatNumericDate } from "@/lib/formatDate";
import type { FoodEntry } from "@/types/nutrition";

/** Column track shared by header and every row so values stay aligned down the list. */
export const ENTRY_GRID_CLASSES =
  "grid grid-cols-[6.5rem_5.5rem_minmax(130px,1fr)_7rem_4.5rem_4.5rem_4.5rem_5.5rem_6rem] items-center gap-x-4";

interface FoodEntryRowProps {
  entry: FoodEntry;
  /** True while this row's own delete request is in flight. */
  deleting: boolean;
  disabled: boolean;
  onDelete: () => void;
  onClick: () => void;
}

/** Formats quantity and unit cleanly, e.g. "1 × 150g" or "150g" or "2 slices". */
export function formatQuantity(quantity: number, unit: string): string {
  const trimmedUnit = (unit || "").trim();

  // If unit is purely numeric (e.g. "150"), treat it as grams: "150g"
  const normalizedUnit =
    trimmedUnit && !/[a-zA-Z]/.test(trimmedUnit) ? `${trimmedUnit}g` : trimmedUnit;

  // If unit has numbers in it (like "150g"): "1 × 150g"
  if (/\d/.test(normalizedUnit)) {
    return `${quantity} × ${normalizedUnit}`;
  }

  // If unit is a standard metric symbol: "150g", "250ml"
  if (["g", "mg", "mcg", "kg", "ml", "l", "oz", "lb"].includes(normalizedUnit.toLowerCase())) {
    return `${quantity}${normalizedUnit}`;
  }

  // If unit is a descriptive word like "serving", "slice", "piece"
  if (normalizedUnit) {
    return `${quantity} ${normalizedUnit}`;
  }

  return `${quantity}`;
}

export default function FoodEntryRow({ entry, deleting, disabled, onDelete, onClick }: FoodEntryRowProps) {
  const { proteinG, carbG, fatG } = entry.macros;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <article
      onClick={onClick}
      className={`${ENTRY_GRID_CLASSES} border-b border-black/5 dark:border-white/5 last:border-b-0 px-5 sm:px-6 py-3.5 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer ${
        menuOpen ? "relative z-30" : "relative z-auto"
      }`}
    >
      <div>
        <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
          {formatNumericDate(entry.date)}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-text-primary dark:text-dark-text capitalize">
          {entry.mealType}
        </p>
      </div>

      <div className="min-w-0 pr-2">
        <p className="text-sm font-semibold text-text-primary dark:text-dark-text truncate">
          {entry.foodName}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
          {formatQuantity(entry.quantity, entry.quantityUnit)}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold tabular-nums text-text-primary dark:text-dark-text">
          {proteinG}
          <span className="text-[10px] font-normal text-text-secondary dark:text-dark-text-secondary ml-0.5">
            g
          </span>
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold tabular-nums text-text-primary dark:text-dark-text">
          {carbG}
          <span className="text-[10px] font-normal text-text-secondary dark:text-dark-text-secondary ml-0.5">
            g
          </span>
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold tabular-nums text-text-primary dark:text-dark-text">
          {fatG}
          <span className="text-[10px] font-normal text-text-secondary dark:text-dark-text-secondary ml-0.5">
            g
          </span>
        </p>
      </div>

      <div className="text-right flex items-baseline justify-end gap-1">
        <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-dark-text">
          {entry.calories}
        </span>
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
          kcal
        </span>
      </div>

      <div ref={menuRef} className="relative flex items-center justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-full mt-1.5 z-50 w-32 rounded-xl bg-white dark:bg-[#1E222B] border border-black/10 dark:border-white/15 shadow-2xl py-1 backdrop-blur-md"
          >
            <Link
              href={`/meals/${entry._id}/edit`}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text-primary dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span>Edit</span>
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setMenuOpen(false);
                onDelete();
              }}
              disabled={disabled}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
            >
              {deleting ? (
                <span className="text-xs">Deleting...</span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
