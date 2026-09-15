"use client";

import MacroRing from "@/components/chat/MacroRing";
import { useCountUp } from "@/hooks/useCountUp";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const DAILY_CALORIE_TARGET = 2200;
const MACROS = [
  { nutrient: "protein" as const, current: 112, target: 140 },
  { nutrient: "carbs" as const, current: 176, target: 240 },
  { nutrient: "fat" as const, current: 48, target: 70 },
];

export default function GoalsVisual() {
  const { ref, isVisible } = useInViewOnce<HTMLDivElement>();
  const calories = useCountUp(DAILY_CALORIE_TARGET, isVisible);

  return (
    <div ref={ref}>
      <p className="text-xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-text-primary dark:text-dark-text">
        {calories.toLocaleString()}
        <span className="ml-1 text-[11px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">kcal a day</span>
      </p>
      <div className="mt-2 sm:mt-5 flex gap-1.5 sm:gap-2">
        {MACROS.map(({ nutrient, current, target }) => (
          <MacroRing
            key={nutrient}
            nutrient={nutrient}
            current={isVisible ? current : 0}
            target={target}
          />
        ))}
      </div>
    </div>
  );
}
