"use client";

import Button from "@/components/ui/Button";

interface ImportRowNotesProps {
  issues: string[];
  reviewed: boolean;
  errorMessages: string[];
  disabled: boolean;
  onMarkReviewed: () => void;
}

/** Under a meal: what the server flagged, and what still fails validation. */
export default function ImportRowNotes({ issues, reviewed, errorMessages, disabled, onMarkReviewed }: ImportRowNotesProps) {
  return (
    <div className="mt-3 space-y-2 text-xs empty:hidden">

      {issues.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 px-3 py-2">
          <ul className="flex-1 space-y-1 text-amber-700 dark:text-amber-300">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          {reviewed ? (
            <span className="shrink-0 font-semibold text-text-secondary dark:text-dark-text-secondary">Checked</span>
          ) : (
            <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onMarkReviewed} className="shrink-0 !py-1.5">
              Looks right
            </Button>
          )}
        </div>
      )}

      {errorMessages.length > 0 && (
        <p role="alert" className="text-error dark:text-error-dark">
          {errorMessages.join(". ")}.
        </p>
      )}
    </div>
  );
}
