"use client";

import { useEffect, useRef, type RefObject } from "react";

/** How close to the top, in pixels, an upward scroll has to get before older messages load. */
const TOP_THRESHOLD_PX = 48;

/**
 * Calls `onLoad` when the user scrolls up to the top of `scrollRef`. Only an
 * upward move counts, so the thread's own jumps (to the bottom on open, or
 * holding position after older messages are prepended) never trigger a load.
 * A wheel or trackpad swipe at the very top also counts, for a thread too short
 * to scroll at all.
 */
export function useLoadOnScrollTop(scrollRef: RefObject<HTMLElement | null>, enabled: boolean, onLoad: () => void) {
  const onLoadRef = useRef(onLoad);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !enabled) return;

    let lastScrollTop = container.scrollTop;

    const handleScroll = () => {
      const movedUp = container.scrollTop < lastScrollTop;
      lastScrollTop = container.scrollTop;
      if (movedUp && container.scrollTop <= TOP_THRESHOLD_PX) onLoadRef.current();
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0 && container.scrollTop === 0) onLoadRef.current();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);
    };
  }, [scrollRef, enabled]);
}
