"use client";

import { useState } from "react";
import { CopyIcon, MoreIcon, TrashIcon } from "@/components/icons";
import { useDismissable } from "@/hooks/useDismissable";

interface MessageActionsMenuProps {
  /** Copied to the clipboard as plain text. */
  content: string;
  onDelete: () => void;
  /** Which side of the trigger the panel opens on. */
  align?: "start" | "end";
  /** "accent" sits the trigger on a colour-filled bubble (the user's own messages); "surface" is the default. */
  variant?: "surface" | "accent";
  /** Positions the trigger within its message; the caller anchors it to a corner. */
  className?: string;
}

const COPIED_LABEL_MS = 1200;

const TRIGGER_VARIANT_CLASSES: Record<"surface" | "accent", string> = {
  surface:
    "text-text-secondary hover:text-text-primary hover:bg-bg-app dark:text-dark-text-secondary dark:hover:text-dark-text dark:hover:bg-dark-surface",
  accent: "text-white/70 hover:text-white hover:bg-white/15",
};

/**
 * The subtle "more" menu that appears on hover over a chat message, offering
 * Copy and Delete. The caller positions it (typically pinned to a message's
 * top-right corner) via `className`; the component only owns its own
 * open/closed behaviour.
 */
export default function MessageActionsMenu({
  content,
  onDelete,
  align = "end",
  variant = "surface",
  className = "",
}: MessageActionsMenuProps) {
  const { open, toggle, close, containerRef } = useDismissable<HTMLDivElement>();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_LABEL_MS);
    } catch {
      // Clipboard access can be blocked by the browser; there is nothing more to offer here.
    }
    close();
  }

  function handleDelete() {
    close();
    onDelete();
  }

  const hasPosition = /(?:^|\s)(absolute|relative|fixed|sticky)(?:\s|$)/.test(className);
  const rootClassName = `${hasPosition ? "" : "relative "}${className}`.trim();

  return (
    <div ref={containerRef} className={rootClassName}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Message actions"
        className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full cursor-pointer transition-opacity duration-150 ${TRIGGER_VARIANT_CLASSES[variant]} ${
          open ? "opacity-100" : "opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        }`}
      >
        <MoreIcon className="h-4 w-4" />
      </button>

      <div
        role="menu"
        aria-label="Message actions"
        className={`absolute top-full mt-3 sm:mt-3.5 z-10 w-32 rounded-xl border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card p-1 shadow-lg transform-gpu transition-all duration-150 ease-out origin-top ${
          align === "end" ? "right-0" : "left-0"
        } ${open ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 -translate-y-1 scale-95 pointer-events-none"}`}
      >
        {content.trim() && (
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-primary dark:text-dark-text hover:bg-bg-app dark:hover:bg-dark-surface cursor-pointer transition-colors duration-150"
          >
            <CopyIcon className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          onClick={handleDelete}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-error dark:text-error-dark hover:bg-bg-app dark:hover:bg-dark-surface cursor-pointer transition-colors duration-150"
        >
          <TrashIcon className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
