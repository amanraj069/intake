"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Dismissable<T extends HTMLElement> {
  open: boolean;
  toggle: () => void;
  close: () => void;
  /** Attach to the element that wraps both the trigger and the panel. */
  containerRef: React.RefObject<T | null>;
}

/**
 * Open/closed state for a popover that should dismiss on an outside click or
 * on Escape, which is what a menu anchored to a trigger needs to feel native.
 */
export function useDismissable<T extends HTMLElement>(): Dismissable<T> {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<T | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(event.target as Node)) close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return { open, toggle, close, containerRef };
}
