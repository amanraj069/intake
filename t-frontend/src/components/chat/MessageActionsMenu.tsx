"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
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

/** Long enough to read "Copied" before the menu closes. */
const COPIED_LABEL_MS = 900;
/** The panel's height plus its gap from the trigger, rounded up. */
const PANEL_ROOM_PX = 104;

const TRIGGER_VARIANT_CLASSES: Record<"surface" | "accent", string> = {
  surface:
    "text-text-secondary hover:text-text-primary hover:bg-bg-app dark:text-dark-text-secondary dark:hover:text-dark-text dark:hover:bg-dark-surface",
  accent: "text-white/70 hover:text-white hover:bg-white/15",
};

const MENU_ITEM_CLASSES =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-bg-app dark:hover:bg-dark-surface cursor-pointer transition-colors duration-150";

/** The bottom edge of the nearest ancestor that clips its content, or of the window. */
function visibleBottomEdge(element: HTMLElement): number {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (/auto|scroll|hidden/.test(getComputedStyle(node).overflowY)) return node.getBoundingClientRect().bottom;
  }
  return window.innerHeight;
}

/** Whether the panel fits below the trigger without being clipped, e.g. on the newest message. */
function hasRoomBelow(element: HTMLElement | null): boolean {
  if (!element) return true;
  return visibleBottomEdge(element) - element.getBoundingClientRect().bottom >= PANEL_ROOM_PX;
}

/**
 * The subtle "more" menu that appears on hover over a chat message, offering
 * Copy and Delete. The caller positions it (typically pinned to a message's
 * top-right corner) via `className`; the component only owns its own
 * open/closed behaviour. The panel is only mounted while open, so a closed
 * menu never adds scrollable space below the newest message.
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
  const [opensUpward, setOpensUpward] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  function handleToggle() {
    if (!open) {
      clearTimeout(copiedTimer.current);
      setCopied(false);
      setOpensUpward(!hasRoomBelow(containerRef.current));
    }
    toggle();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard access can be blocked by the browser; there is nothing more to offer here.
      close();
      return;
    }
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => {
      close();
      setCopied(false);
    }, COPIED_LABEL_MS);
  }

  function handleDelete() {
    close();
    onDelete();
  }

  /** A photo message wraps the menu in a link: clicks here must never open the photo. */
  function keepClickInMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  const hasPosition = /(?:^|\s)(absolute|relative|fixed|sticky)(?:\s|$)/.test(className);
  const rootClassName = `${hasPosition ? "" : "relative "}${className}`.trim();
  const panelPlacement = opensUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-3 sm:mt-3.5 origin-top";

  return (
    <div ref={containerRef} className={rootClassName} onClick={keepClickInMenu}>
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Message actions"
        className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full cursor-pointer transition-opacity duration-150 ${TRIGGER_VARIANT_CLASSES[variant]} ${
          open ? "opacity-100" : "opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        }`}
      >
        <MoreIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Message actions"
          className={`absolute z-10 w-32 rounded-xl border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card p-1 shadow-lg transition-[opacity,scale] duration-150 ease-out starting:opacity-0 starting:scale-95 ${panelPlacement} ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {content.trim() && (
            <button
              type="button"
              role="menuitem"
              onClick={handleCopy}
              className={`${MENU_ITEM_CLASSES} text-text-primary dark:text-dark-text`}
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className={`${MENU_ITEM_CLASSES} text-error dark:text-error-dark`}
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
