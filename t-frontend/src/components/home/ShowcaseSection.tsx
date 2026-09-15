"use client";

import { useEffect, useRef, useState } from "react";
import ShowcaseCard from "./ShowcaseCard";
import AssistantVisual from "./showcase/AssistantVisual";
import DishesVisual from "./showcase/DishesVisual";
import GoalsVisual from "./showcase/GoalsVisual";
import ImportVisual from "./showcase/ImportVisual";
import PhotoScanVisual from "./showcase/PhotoScanVisual";
import ReportsVisual from "./showcase/ReportsVisual";

/**
 * Each card previews the real interface with sample figures rather than an
 * icon, so visitors see what they get before signing up.
 */
export default function ShowcaseSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setHeaderVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "100px 0px 50px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="scroll-mt-28 sm:scroll-mt-36 px-4 sm:px-8 py-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div
          ref={headerRef}
          className={`flex flex-col gap-1.5 sm:gap-4 lg:flex-row lg:items-end lg:justify-between transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <h2 className="max-w-xl text-xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight sm:tracking-tighter leading-[1.1] sm:leading-[1.05] text-text-primary dark:text-dark-text">
            Log it however it happened.
          </h2>
          <p className="max-w-sm text-[11px] sm:text-sm lg:text-base font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
            Every entry lands in one diary and counts toward the same goals, whichever way it came in.
          </p>
        </div>

        <div className="mt-5 sm:mt-12 grid gap-2.5 sm:gap-5 lg:grid-cols-3">
          <ShowcaseCard
            wide
            title="Snap a plate or a label"
            description="Photograph a cooked meal or a nutrition facts panel. Each dish is identified and portioned, with a transparent confidence score you can inspect and adjust before saving."
          >
            <PhotoScanVisual />
          </ShowcaseCard>
          <ShowcaseCard
            title="Or just say it"
            description="The assistant logs meals and updates goals from plain language, and nothing is saved until you confirm."
          >
            <AssistantVisual />
          </ShowcaseCard>
          <ShowcaseCard
            title="Goals built for you"
            description="A short onboarding recommends calorie and macro targets from your body profile and activity."
          >
            <GoalsVisual />
          </ShowcaseCard>
          <ShowcaseCard
            wide
            title="See the pattern, not just the day"
            description="A weekly trend against your target band on the dashboard, and reports over any range with macro and micronutrient breakdowns."
          >
            <ReportsVisual />
          </ShowcaseCard>
          <ShowcaseCard
            wide
            title="Meals made of dishes"
            description="A thali is not one food. Log each dish with its own quantity and nutrition, and the meal totals itself."
          >
            <DishesVisual />
          </ShowcaseCard>
          <ShowcaseCard
            title="Bring your history"
            description="Import a PDF food diary. Estimates are flagged and duplicates caught before anything is committed."
          >
            <ImportVisual />
          </ShowcaseCard>
        </div>
      </div>
    </section>
  );
}
