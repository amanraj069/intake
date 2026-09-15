"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface UseInViewOnceOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * True once the ref'd element has scrolled into view, and stays true after:
 * entrance animations play once, they don't reverse when the element scrolls
 * back out. An element already on screen at mount (e.g. above the fold) is
 * detected immediately rather than waiting on the observer's first callback.
 */
export function useInViewOnce<T extends HTMLElement>({
  threshold = 0.05,
  rootMargin = "80px 0px 40px 0px",
}: UseInViewOnceOptions = {}): { ref: RefObject<T | null>; isVisible: boolean } {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isVisible };
}
