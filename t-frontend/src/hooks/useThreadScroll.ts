"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animateScrollToBottom, prefersReducedMotion } from "@/lib/animateScroll";
import type { ChatThreadMessage } from "@/types/chat";

/** Lets the first messages begin fading in before the glide sets off, so the two read as one motion. */
const GLIDE_START_DELAY_MS = 150;

/**
 * Keeps the newest turn in view as the thread grows, except when an older page
 * is prepended: then the view stays anchored on what the user was reading
 * instead of jumping back to the bottom.
 *
 * On initial visit or refresh, it guarantees the user lands at the bottom
 * of the chat even as async content (images, receipts, nutrition cards, fonts)
 * renders and expands.
 *
 * With `glideOnOpen`, the thread instead opens at its oldest loaded message and
 * glides down to the newest, so opening previous chats feels like the history
 * unrolling rather than appearing. Only the value at mount is read.
 */
export function useThreadScroll(messages: ChatThreadMessage[], sending: boolean, glideOnOpen = false) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLOListElement>(null);
  const isAtBottomRef = useRef(true);
  const skipNextResizeScrollRef = useRef(false);
  // While the opening glide runs, every snap-to-bottom below would cut it short, so they all wait for it.
  const glidingRef = useRef(glideOnOpen);

  const firstId = messages[0]?.id;
  const lastId = messages.at(-1)?.id;
  const previous = useRef({ firstId, lastId, scrollHeight: 0 });

  const scrollToBottom = () => {
    const container = scrollRef.current;
    if (!container || glidingRef.current) return;
    container.scrollTop = container.scrollHeight;
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !glidingRef.current) return;

    if (prefersReducedMotion()) {
      glidingRef.current = false;
      scrollToBottom();
      return;
    }

    container.scrollTop = 0;
    let stopGlide: (() => void) | undefined;
    const startTimer = setTimeout(() => {
      stopGlide = animateScrollToBottom(container, (completed) => {
        glidingRef.current = false;
        // A user who grabbed the scroll mid-glide keeps the position they chose.
        if (!completed) return;
        isAtBottomRef.current = true;
        scrollToBottom();
      });
    }, GLIDE_START_DELAY_MS);

    return () => {
      clearTimeout(startTimer);
      stopGlide?.();
    };
    // Runs once on mount: the glide is an opening animation, not a reaction to later changes.
  }, []);

  // Track whether the user has scrolled away from the bottom.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isAtBottomRef.current = distanceFromBottom <= 80;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const olderPagePrepended =
      previous.current.scrollHeight > 0 &&
      previous.current.firstId !== firstId &&
      previous.current.lastId === lastId;

    if (olderPagePrepended) {
      skipNextResizeScrollRef.current = true;
      container.scrollTop =
        container.scrollTop + container.scrollHeight - previous.current.scrollHeight;
    } else {
      if (previous.current.lastId !== lastId || sending) {
        isAtBottomRef.current = true;
      }
      if (isAtBottomRef.current) {
        scrollToBottom();
      }
    }

    previous.current = { firstId, lastId, scrollHeight: container.scrollHeight };
  }, [firstId, lastId, sending]);

  // Keep pinned to bottom across multiple frames after mount / refresh while layout settles
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    scrollToBottom();
    const rafId = requestAnimationFrame(scrollToBottom);
    const t1 = setTimeout(scrollToBottom, 60);
    const t2 = setTimeout(scrollToBottom, 200);
    const t3 = setTimeout(scrollToBottom, 500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [firstId, lastId]);

  // Catch image loads in bubbles to ensure scroll stays pinned to bottom
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement && isAtBottomRef.current) {
        scrollToBottom();
      }
    };

    container.addEventListener("load", handleLoad, true);
    return () => container.removeEventListener("load", handleLoad, true);
  }, []);

  // ResizeObserver on the content to react to dynamic expansions (cards, charts, fonts)
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      if (skipNextResizeScrollRef.current) {
        skipNextResizeScrollRef.current = false;
        return;
      }
      if (isAtBottomRef.current) {
        scrollToBottom();
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return { scrollRef, contentRef };
}
