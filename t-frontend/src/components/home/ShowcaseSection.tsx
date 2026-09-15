"use client";

import { useInViewOnce } from "@/hooks/useInViewOnce";
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
  const { ref: headerRef, isVisible: headerVisible } = useInViewOnce<HTMLDivElement>({
    rootMargin: "100px 0px 50px 0px",
  });

  return (
    <section className="px-6 sm:px-8 py-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div
          ref={headerRef}
          className={`flex flex-col items-center sm:items-start gap-1.5 sm:gap-4 lg:flex-row lg:items-end lg:justify-between transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <h2 className="max-w-xl text-xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight sm:tracking-tighter leading-[1.1] sm:leading-[1.05] text-text-primary dark:text-dark-text text-center sm:text-left">
            Log it however it happened.
          </h2>
          <p className="max-w-[250px] sm:max-w-sm text-[11px] sm:text-sm lg:text-base font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary text-center sm:text-left mb-3 lg:mb-0">
            Every entry lands in one diary and counts toward the same goals, whichever way it came in.
          </p>
        </div>

        <div className="mt-4 sm:mt-12 flex flex-col gap-6 sm:grid sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ShowcaseCard index={0} wide title="Snap a plate or a label" description="Photograph a cooked meal or a nutrition facts panel. Each dish is identified and portioned, with a transparent confidence score you can inspect and adjust before saving.">
            <PhotoScanVisual />
          </ShowcaseCard>
          <ShowcaseCard index={1} title="Or just say it" description="The assistant logs meals and updates goals from plain language, and nothing is saved until you confirm.">
            <AssistantVisual />
          </ShowcaseCard>
          <ShowcaseCard index={2} title="Goals built for you" description="A short onboarding recommends calorie and macro targets from your body profile and activity.">
            <GoalsVisual />
          </ShowcaseCard>
          <ShowcaseCard index={3} wide title="See the pattern, not just the day" description="A weekly trend against your target band on the dashboard, and reports over any range with macro and micronutrient breakdowns.">
            <ReportsVisual />
          </ShowcaseCard>
          <div className="hidden sm:contents">
            <ShowcaseCard index={4} wide title="Meals made of dishes" description="A thali is not one food. Log each dish with its own quantity and nutrition, and the meal totals itself.">
              <DishesVisual />
            </ShowcaseCard>
          </div>
          <div className="hidden sm:contents">
            <ShowcaseCard index={5} title="Bring your history" description="Import a PDF food diary. Estimates are flagged and duplicates caught before anything is committed.">
              <ImportVisual />
            </ShowcaseCard>
          </div>
        </div>
      </div>
    </section>
  );
}
