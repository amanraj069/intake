"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** How many records this page actually shows, for the range readout. */
  pageSize: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

function describeRange(page: number, pageSize: number, total: number): string {
  if (total === 0) return "No entries";
  const first = (page - 1) * pageSize + 1;
  return `${first}-${first + pageSize - 1} of ${total}`;
}

/** Page controls for any list endpoint using the shared pagination envelope. */
export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  disabled = false,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 pt-2 sm:pt-4"
    >
      {/* Mobile view: unified 3-part toolbar */}
      <div className="flex sm:hidden items-center justify-between w-full">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-bg-card dark:bg-dark-bg-card border border-border dark:border-dark-border text-text-primary dark:text-dark-text hover:bg-bg-surface dark:hover:bg-dark-surface transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer shadow-2xs"
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          <span>Prev</span>
        </button>

        <div className="text-center px-2">
          <p className="text-xs font-bold text-text-primary dark:text-dark-text tabular-nums">
            Page {page} of {totalPages}
          </p>
          <p className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary tabular-nums">
            {describeRange(page, pageSize, total)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-bg-card dark:bg-dark-bg-card border border-border dark:border-dark-border text-text-primary dark:text-dark-text hover:bg-bg-surface dark:hover:bg-dark-surface transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer shadow-2xs"
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Desktop view: description on the left, buttons on the right */}
      <div className="hidden sm:flex sm:items-center sm:justify-between w-full">
        <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary">
          Showing <span className="font-semibold text-text-primary dark:text-dark-text">{describeRange(page, pageSize, total)}</span>
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg-card dark:bg-dark-bg-card border border-border dark:border-dark-border text-text-primary dark:text-dark-text hover:bg-bg-surface dark:hover:bg-dark-surface transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer shadow-2xs"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-semibold tabular-nums text-text-primary dark:text-dark-text px-1">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= totalPages}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg-card dark:bg-dark-bg-card border border-border dark:border-dark-border text-text-primary dark:text-dark-text hover:bg-bg-surface dark:hover:bg-dark-surface transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer shadow-2xs"
          >
            <span>Next</span>
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
