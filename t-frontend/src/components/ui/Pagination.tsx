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
  "px-5 py-3 border border-black/10 dark:border-white/10",
  "text-[10px] font-bold uppercase tracking-[0.2em]",
  "text-text-primary dark:text-dark-text",
  "transition-colors duration-100 cursor-pointer",
  "hover:bg-text-primary hover:text-bg-primary",
  "dark:hover:bg-dark-text dark:hover:text-dark-bg",
  "disabled:opacity-40 disabled:cursor-not-allowed",
  "disabled:hover:bg-transparent disabled:hover:text-text-primary",
  "dark:disabled:hover:bg-transparent dark:disabled:hover:text-dark-text",
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
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-black/10 dark:border-white/10 pt-6"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary">
        {describeRange(page, pageSize, total)}
      </p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className={STEP_BUTTON_CLASSES}
        >
          Previous
        </button>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary dark:text-dark-text whitespace-nowrap">
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
