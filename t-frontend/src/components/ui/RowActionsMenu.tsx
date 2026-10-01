"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RowActionsMenuProps {
  /** Lets the row lift itself above its neighbours while the menu overlaps them. */
  onOpenChange?: (open: boolean) => void;
  /** The menu items; `close` dismisses the menu once an item has acted. */
  children: (close: () => void) => ReactNode;
}

export const MENU_ITEM_CLASSES =
  "flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text-primary dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer";

function MoreVerticalGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

/** The three-dot menu at the end of a table row, closed by an outside click or Escape. */
export default function RowActionsMenu({ onOpenChange, children }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function setMenuOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      onOpenChange?.(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={menuRef} className="relative flex items-center justify-end">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen(!open);
        }}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVerticalGlyph />
      </button>

      {open && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute right-0 top-full mt-1.5 z-50 min-w-32 rounded-xl bg-white dark:bg-[#1E222B] border border-black/10 dark:border-white/15 shadow-2xl py-1 backdrop-blur-md"
        >
          {children(() => setMenuOpen(false))}
        </div>
      )}
    </div>
  );
}
