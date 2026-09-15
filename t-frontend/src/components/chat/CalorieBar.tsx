"use client";

interface CalorieBarProps {
  /** Today's total calories consumed. */
  current: number;
  /** Daily calorie target, or null if the user has no goal set. */
  target: number | null;
  className?: string;
}

/**
 * Horizontal calorie progress indicator shown above the protein/carbs/fat
 * rings: label and "current / target kcal" on one line, with a filled track
 * underneath. Calories are intentionally never shown as a ring so they read
 * as the single headline metric rather than one macro among equals.
 */
export default function CalorieBar({ current, target, className = "" }: CalorieBarProps) {
  const percent = target ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;

  return (
    <div className={`rounded-xl bg-calories-bg dark:bg-dark-calories-bg px-3 py-2.5 sm:px-4 sm:py-3 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-calories dark:text-dark-calories">
          Calories
        </span>
        <span className="text-xs sm:text-sm font-bold text-text-primary dark:text-dark-text tabular-nums">
          {Math.round(current)}
          <span className="font-normal text-text-secondary dark:text-dark-text-secondary">
            {target != null ? ` / ${Math.round(target)} kcal` : " kcal"}
          </span>
        </span>
      </div>
      <div className="mt-1.5 sm:mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-calories dark:bg-dark-calories transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
