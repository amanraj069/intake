"use client";

import { useInViewOnce } from "@/hooks/useInViewOnce";
import HomeCtaLinks from "./HomeCtaLinks";
import NextMealPreview from "./NextMealPreview";

const QUICK_FACTS = [
  { value: "2 min", label: "to set your goals" },
  { value: "4 ways", label: "to log a meal" },
] as const;

function QuickFacts() {
  return (
    <dl className="mt-6 sm:mt-10 flex justify-center lg:justify-start gap-8 sm:gap-10 border-t border-border dark:border-dark-border pt-4 sm:pt-6">
      {QUICK_FACTS.map(({ value, label }) => (
        <div key={value} className="text-center lg:text-left">
          <dt className="sr-only">{label}</dt>
          <dd className="text-base sm:text-2xl font-extrabold tracking-tight text-text-primary dark:text-dark-text">{value}</dd>
          <dd className="text-[10px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">{label}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ClosingCta() {
  const { ref: cardRef, isVisible } = useInViewOnce<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: "0px 0px -30px 0px",
  });

  return (
    <section className="px-4 sm:px-8 pt-14 sm:pt-1 pb-16 sm:pb-24">
      <div
        ref={cardRef}
        className={`relative mx-auto max-w-6xl overflow-hidden rounded-xl sm:rounded-2xl bg-bg-card dark:bg-dark-bg-card shadow-sm dark:shadow-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-[0.98]"
        }`}
      >
        {/* A soft accent glow gives the closing card presence without a heavy fill. */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-accent/10 dark:bg-accent-dark/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid gap-6 sm:gap-10 px-4 py-6 sm:px-10 sm:py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16 lg:px-14">
          <div className="text-center lg:text-left">
            <p className="text-[11px] sm:text-sm font-semibold text-accent dark:text-accent-dark">Ready when you are</p>
            <h2 className="mt-1.5 sm:mt-3 max-w-lg mx-auto lg:mx-0 text-xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight sm:tracking-tighter leading-[1.1] sm:leading-[1.05] text-text-primary dark:text-dark-text">
              Start with today&apos;s next meal.
            </h2>
            <p className="mt-2 sm:mt-4 max-w-[260px] sm:max-w-md mx-auto lg:mx-0 text-[11px] sm:text-sm lg:text-base font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
              Set your goals in a couple of minutes. Your first entry takes seconds, and every one after lands in the same diary.
            </p>
            <HomeCtaLinks className="mt-5 sm:mt-8 justify-center lg:justify-start" />
            <QuickFacts />
          </div>
          <div aria-hidden="true">
            <NextMealPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
