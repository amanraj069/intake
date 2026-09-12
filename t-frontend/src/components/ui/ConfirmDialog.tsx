"use client";

import { useEffect, useRef } from "react";
import Button from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Set while the confirmed action is in flight, to keep it from running twice. */
  working?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A blocking confirm step for destructive actions. Deliberately not the native
 * `window.confirm`, which cannot be styled and blocks the whole page.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  working = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    confirmButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-black/40 dark:bg-black/60 cursor-default"
      />

      <div className="relative w-full max-w-md border border-black/10 dark:border-white/10 bg-bg-primary dark:bg-dark-bg">
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <h2
            id="confirm-dialog-title"
            className="text-[10px] font-bold   text-accent dark:text-accent-dark"
          >
            {title}
          </h2>
          <p className="mt-3 text-sm font-light leading-relaxed text-text-primary dark:text-dark-text">
            {description}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-black/10 dark:border-white/10 px-6 py-5 sm:px-8">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={working}>
            Cancel
          </Button>
          <Button
            ref={confirmButtonRef}
            variant="danger"
            size="sm"
            onClick={onConfirm}
            loading={working}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
