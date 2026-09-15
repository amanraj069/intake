"use client";

import { useEffect, useState } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { prefersReducedMotion } from "@/lib/animateScroll";

type Phase = "idle" | "message" | "typing" | "reply";

const MESSAGE_DELAY_MS = 150;
const TYPING_DELAY_MS = 700;
const REPLY_DELAY_MS = 1300;

/**
 * A condensed chat turn: the user's message, then the proposal they confirm.
 * The reply card is always present in the layout (just invisible at first),
 * so its footprint is reserved from the start and nothing around it shifts
 * as the typing indicator hands off to the real content.
 */
export default function AssistantVisual() {
  const { ref, isVisible } = useInViewOnce<HTMLDivElement>();
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (!isVisible) return;
    if (prefersReducedMotion()) {
      const frameId = requestAnimationFrame(() => setPhase("reply"));
      return () => cancelAnimationFrame(frameId);
    }

    const timers = [
      setTimeout(() => setPhase("message"), MESSAGE_DELAY_MS),
      setTimeout(() => setPhase("typing"), TYPING_DELAY_MS),
      setTimeout(() => setPhase("reply"), REPLY_DELAY_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  const showMessage = phase === "message" || phase === "typing" || phase === "reply";
  const showTyping = phase === "typing";
  const showReply = phase === "reply";

  return (
    <div ref={ref} className="space-y-1.5 sm:space-y-3 text-xs sm:text-sm">
      <p
        className={`ml-auto w-fit max-w-[85%] rounded-xl sm:rounded-2xl rounded-br-md bg-accent-muted dark:bg-accent-dark-muted px-2.5 py-1.5 sm:px-4 sm:py-2.5 text-[11px] sm:text-sm text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          showMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        Had dal and two rotis for lunch
      </p>

      <div className="relative">
        <div
          className={`max-w-[92%] rounded-xl sm:rounded-2xl rounded-bl-md bg-bg-app dark:bg-dark-bg-app p-2.5 sm:p-4 transition-opacity duration-400 ease-out ${
            showReply ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-[10px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary">Log to Lunch?</p>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text">
            520 kcal <span className="font-light text-text-secondary dark:text-dark-text-secondary">· 21g protein</span>
          </p>
          <div className="mt-2 sm:mt-3 flex gap-2 text-[10px] sm:text-xs font-semibold">
            <span className="rounded-lg bg-text-primary dark:bg-dark-text px-2 py-1 sm:px-3 sm:py-1.5 text-bg-card dark:text-dark-bg-card">Confirm</span>
            <span className="rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-text-secondary dark:text-dark-text-secondary">Edit</span>
          </div>
        </div>

        {showTyping && (
          <div className="absolute inset-0 flex items-center gap-1 rounded-xl sm:rounded-2xl rounded-bl-md bg-bg-app dark:bg-dark-bg-app px-3 animate-fade-in">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-1.5 w-1.5 rounded-full bg-text-secondary/60 dark:bg-dark-text-secondary/60 animate-bounce"
                style={{ animationDelay: `${dot * 120}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
