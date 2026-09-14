"use client";

interface JsonModeToggleProps {
  jsonMode: boolean;
  /** Label for returning to the form, e.g. "Fill the form" or "Update with form". */
  formLabel: string;
  /** Label for opening the JSON editor, e.g. "Fill with JSON". */
  jsonLabel: string;
  onToggle: () => void;
}

/** Switches the meal page between the form and the JSON editor. */
export default function JsonModeToggle({ jsonMode, formLabel, jsonLabel, onToggle }: JsonModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center justify-center sm:justify-start gap-2 sm:gap-2.5 h-11 px-2.5 sm:px-5 rounded-xl border border-input-border dark:border-dark-input-border bg-bg-card dark:bg-dark-bg-card hover:bg-black/[0.06] dark:hover:bg-[#1A1F2C] text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap w-full sm:w-auto"
    >
      <svg
        className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {jsonMode ? (
          <>
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M9 12h6" />
            <path d="M9 16h6" />
          </>
        ) : (
          <>
            <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
            <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
          </>
        )}
      </svg>
      <span>{jsonMode ? formLabel : jsonLabel}</span>
    </button>
  );
}
