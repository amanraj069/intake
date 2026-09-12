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
      className="border border-black/10 dark:border-white/10 p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent dark:text-accent-dark">
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
