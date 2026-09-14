"use client";

import { useCallback, useEffect, useState } from "react";

interface DeletedMessageToastProps {
  onUndo: () => void;
  onDismiss: () => void;
}

/** Auto-dismiss after 3 seconds. */
const VISIBLE_MS = 3000;
const EXIT_TRANSITION_MS = 200;

/**
 * A toast shown directly above the chat composer input area offering to undo
 * a just-deleted message. Matches the width and horizontal margins of the composer.
 */
export default function DeletedMessageToast({ onUndo, onDismiss }: DeletedMessageToastProps) {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, EXIT_TRANSITION_MS);
  }, [onDismiss]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [dismiss]);

  function handleUndo() {
    setExiting(true);
    onUndo();
  }

  return (
    <div className="shrink-0 px-3 pb-2 sm:px-8 lg:px-12">
      <div
        role="status"
        className={`mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl sm:rounded-3xl border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card px-4 py-2.5 sm:px-6 sm:py-3 shadow-xs transition-all duration-200 ease-out ${
          entered && !exiting ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-dark-text">
          Message deleted
        </span>
        <button
          type="button"
          onClick={handleUndo}
          className="text-xs sm:text-sm font-bold text-accent dark:text-accent-dark hover:underline cursor-pointer"
        >
          Undo
        </button>
      </div>
    </div>
  );
}

