"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/animateScroll";

/**
 * Counts from 0 up to `target` once `active` becomes true, decelerating into
 * place rather than ticking at a constant rate. Jumps straight to the target
 * for a viewer who prefers reduced motion. Plays once: `active` flipping back
 * to false and true again does not restart it.
 */
export function useCountUp(target: number, active: boolean, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    if (prefersReducedMotion()) {
      const frameId = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frameId);
    }

    const startTime = performance.now();
    let frameId: number;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [active, target, durationMs]);

  return value;
}
