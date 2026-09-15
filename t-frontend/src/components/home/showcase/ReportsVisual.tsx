"use client";

import { useInViewOnce } from "@/hooks/useInViewOnce";

const DAILY_TARGET = 2200;
const CHART_CEILING = 2600;
const WEEK = [
  { day: "M", calories: 1980 },
  { day: "T", calories: 2310 },
  { day: "W", calories: 2050 },
  { day: "T", calories: 1720 },
  { day: "F", calories: 2240 },
  { day: "S", calories: 2520 },
  { day: "S", calories: 2140 },
] as const;

const BAR_STAGGER_MS = 60;

/** Mirrors the dashboard's 90-110% compliance band: days inside it get the full colour. */
function isWithinTargetBand(calories: number): boolean {
  return calories >= DAILY_TARGET * 0.9 && calories <= DAILY_TARGET * 1.1;
}

export default function ReportsVisual() {
  const { ref, isVisible } = useInViewOnce<HTMLDivElement>();
  const targetOffset = `${(DAILY_TARGET / CHART_CEILING) * 100}%`;

  return (
    <div ref={ref}>
      <div className="relative flex h-20 sm:h-40 items-end gap-1.5 sm:gap-2.5">
        <div
          className={`absolute inset-x-0 border-t border-dashed border-text-secondary/40 dark:border-dark-text-secondary/40 transition-opacity duration-500 ease-out ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ bottom: targetOffset, transitionDelay: "500ms" }}
        />
        {WEEK.map(({ day, calories }, index) => (
          <div
            key={`${day}-${index}`}
            className={`flex-1 rounded-md transition-[height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isWithinTargetBand(calories)
                ? "bg-calories dark:bg-dark-calories"
                : "bg-calories-muted dark:bg-dark-calories-muted"
            }`}
            style={{
              height: isVisible ? `${(calories / CHART_CEILING) * 100}%` : "0%",
              transitionDelay: `${index * BAR_STAGGER_MS}ms`,
            }}
          />
        ))}
      </div>
      <div className="mt-1 sm:mt-2 flex gap-1.5 sm:gap-2.5">
        {WEEK.map(({ day }, index) => (
          <span
            key={`${day}-${index}`}
            className="flex-1 text-center text-[10px] sm:text-[11px] font-light text-text-secondary dark:text-dark-text-secondary"
          >
            {day}
          </span>
        ))}
      </div>
    </div>
  );
}
