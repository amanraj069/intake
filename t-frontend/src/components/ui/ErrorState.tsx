"use client";

import Button from "./Button";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

/** Replaces content that failed to load, so the user never faces a blank panel. */
export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
    >
      <div>
        <p className="text-[10px] font-bold   text-accent dark:text-accent-dark">
          Could not load
        </p>
        <p className="mt-2 text-sm font-light text-text-primary dark:text-dark-text">{message}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
