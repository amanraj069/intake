"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** How many records this page actually shows, for the range readout. */
  pageSize: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

const STEP_BUTTON_CLASSES = [
  "px-4 py-2 border border-transparent",
  "text-[10px] font-bold  ",
  "text-text-secondary dark:text-dark-text-secondary",
  "transition-colors duration-100 cursor-pointer",
  "hover:border-black/15 hover:text-text-primary",
  "dark:hover:border-white/15 dark:hover:text-dark-text",
  "disabled:opacity-30 disabled:cursor-not-allowed",
  "disabled:hover:border-transparent disabled:hover:text-text-secondary",
  "dark:disabled:hover:border-transparent dark:disabled:hover:text-dark-text-secondary",
].join(" ");

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
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-black/10 dark:border-white/10 pt-5"
    >
      <p className="text-[10px] font-bold   text-text-secondary dark:text-dark-text-secondary">
        {describeRange(page, pageSize, total)}
      </p>

      <div className="flex items-center gap-2 sm:gap-4 -mr-4">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className={STEP_BUTTON_CLASSES}
        >
          Previous
        </button>

        <p className="text-[10px] font-bold   tabular-nums text-text-primary dark:text-dark-text whitespace-nowrap">
          Page {page} / {totalPages}
        </p>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className={STEP_BUTTON_CLASSES}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
