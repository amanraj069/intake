"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const CALORIE_TARGET = 2200;
const LOGGED_MEALS = [
  { name: "Breakfast", detail: "Oats, banana, coffee", calories: 420 },
  { name: "Lunch", detail: "Dal, two rotis, salad", calories: 610 },
] as const;
const LOGGED_CALORIES = LOGGED_MEALS.reduce((total, meal) => total + meal.calories, 0);
const LOGGING_METHODS = ["Photo", "Chat", "Manual"] as const;

/** Class names are spelled out in full so Tailwind can find them in the source. */
const MACRO_BARS = [
  { label: "Protein", percent: 62, fill: "bg-protein dark:bg-dark-protein", text: "text-protein dark:text-dark-protein" },
  { label: "Carbs", percent: 48, fill: "bg-carbs dark:bg-dark-carbs", text: "text-carbs dark:text-dark-carbs" },
  { label: "Fat", percent: 41, fill: "bg-fat dark:bg-dark-fat", text: "text-fat dark:text-dark-fat" },
] as const;

function LoggedMealRow({ name, detail, calories }: (typeof LOGGED_MEALS)[number]) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-bg-card dark:bg-dark-bg-card px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm dark:shadow-none">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text">{name}</p>
        <p className="truncate text-[10px] sm:text-xs font-light text-text-secondary dark:text-dark-text-secondary">{detail}</p>
      </div>
      <p className="shrink-0 text-xs sm:text-sm font-semibold tabular-nums text-text-primary dark:text-dark-text">
        {calories}
        <span className="ml-0.5 font-light text-text-secondary dark:text-dark-text-secondary">kcal</span>
      </p>
    </li>
  );
}

function NextMealSlot() {
  return (
    <li className="rounded-xl border border-dashed border-accent/40 dark:border-accent-dark/40 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/50 dark:bg-accent-dark/50 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent dark:bg-accent-dark" />
        </span>
        <p className="text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text">Dinner</p>
        <p className="text-[10px] sm:text-xs font-light text-text-secondary dark:text-dark-text-secondary">Your next meal</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {LOGGING_METHODS.map((method) => (
          <span
            key={method}
            className="rounded-lg bg-bg-card dark:bg-dark-bg-card px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary"
          >
            {method}
          </span>
        ))}
      </div>
    </li>
  );
}

function MacroBars({ isVisible }: { isVisible: boolean }) {
  return (
    <dl className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
      {MACRO_BARS.map(({ label, percent, fill, text }) => (
        <div key={label}>
          <dt className={`text-[10px] sm:text-xs font-semibold ${text}`}>{label}</dt>
          <dd className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
            <span
              className={`block h-full rounded-full transition-[width] duration-1000 ease-out ${fill}`}
              style={{ width: isVisible ? `${percent}%` : "0%" }}
            />
            <span className="sr-only">{percent}% of target</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A snapshot of a day half logged, so the closing call to action points at a
 * concrete next step (the empty dinner slot) rather than a generic slogan.
 */
export default function NextMealPreview() {
  const { ref, isVisible } = useInViewOnce<HTMLDivElement>();
  const calories = useCountUp(LOGGED_CALORIES, isVisible);
  const caloriePercent = (LOGGED_CALORIES / CALORIE_TARGET) * 100;

  return (
    <div ref={ref} className="rounded-xl sm:rounded-2xl bg-bg-app dark:bg-dark-bg-app p-3 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary">Today</p>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight tabular-nums text-text-primary dark:text-dark-text">
            {calories.toLocaleString()}
            <span className="ml-1 text-[10px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              of {CALORIE_TARGET.toLocaleString()} kcal
            </span>
          </p>
        </div>
        <span className="rounded-lg bg-calories-bg dark:bg-dark-calories-bg px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-calories dark:text-dark-calories">
          On track
        </span>
      </div>
      <div className="mt-2 sm:mt-3 h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-calories dark:bg-dark-calories transition-[width] duration-1000 ease-out"
          style={{ width: isVisible ? `${caloriePercent}%` : "0%" }}
        />
      </div>
      <MacroBars isVisible={isVisible} />
      <ul className="mt-3 sm:mt-5 space-y-1.5 sm:space-y-2">
        {LOGGED_MEALS.map((meal) => (
          <LoggedMealRow key={meal.name} {...meal} />
        ))}
        <NextMealSlot />
      </ul>
    </div>
  );
}
