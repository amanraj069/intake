"use client";

import { useEffect, useRef, useState } from "react";
import HomeCtaLinks from "./HomeCtaLinks";

export default function ClosingCta() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
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
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="px-4 sm:px-8 pt-1 pb-6 sm:pb-20">
      <div
        ref={cardRef}
        className={`mx-auto flex max-w-6xl flex-col gap-3.5 sm:gap-8 rounded-xl sm:rounded-2xl bg-text-primary dark:bg-dark-bg-card px-4 py-5 sm:px-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-[0.98]"
        }`}
      >
        <div>
          <h2 className="max-w-lg text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight sm:tracking-tighter leading-[1.1] sm:leading-[1.05] text-white dark:text-dark-text">
            Start with today&apos;s next meal.
          </h2>
          <p className="mt-1 sm:mt-3 max-w-md text-[11px] sm:text-sm lg:text-base font-light text-white/70 dark:text-dark-text-secondary">
            Set your goals in a couple of minutes. Your first entry takes seconds.
          </p>
        </div>
        <HomeCtaLinks tone="accent" className="shrink-0 w-full lg:w-auto" />
      </div>
    </section>
  );
}
