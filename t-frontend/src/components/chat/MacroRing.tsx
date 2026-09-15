"use client";

export type RingNutrient = "calories" | "protein" | "carbs" | "fat";

interface MacroRingProps {
  nutrient: RingNutrient;
  /** Today's total for this macro, in grams or kcal. */
  current: number;
  /** Daily target in grams or kcal, or null if the user has no goal set. */
  target: number | null;
  className?: string;
}

const RING_RADIUS = 28;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Class names are spelled out in full so Tailwind can find them in the source. */
const NUTRIENT_STYLES: Record<
  RingNutrient,
  { label: string; text: string; stroke: string; background: string; unit: string }
> = {
  calories: {
    label: "Calories",
    text: "text-calories dark:text-dark-calories",
    stroke: "stroke-calories dark:stroke-dark-calories",
    background: "bg-calories-bg dark:bg-dark-calories-bg",
    unit: "kcal",
  },
  protein: {
    label: "Protein",
    text: "text-protein dark:text-dark-protein",
    stroke: "stroke-protein dark:stroke-dark-protein",
    background: "bg-protein-bg dark:bg-dark-protein-bg",
    unit: "g",
  },
  carbs: {
    label: "Carbs",
    text: "text-carbs dark:text-dark-carbs",
    stroke: "stroke-carbs dark:stroke-dark-carbs",
    background: "bg-carbs-bg dark:bg-dark-carbs-bg",
    unit: "g",
  },
  fat: {
    label: "Fat",
    text: "text-fat dark:text-dark-fat",
    stroke: "stroke-fat dark:stroke-dark-fat",
    background: "bg-fat-bg dark:bg-dark-fat-bg",
    unit: "g",
  },
};

/**
 * A small circular progress ring showing today's total for one macronutrient
 * against its daily target. The ring fills to the percentage completed, and
 * the centre shows "current/target g" (or kcal).
 */
export default function MacroRing({ nutrient, current, target, className = "" }: MacroRingProps) {
  const styles = NUTRIENT_STYLES[nutrient];
  const percent = target ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  const dashOffset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 sm:gap-1 rounded-xl px-1.5 py-2 sm:px-3 sm:py-2.5 transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-xs ${styles.background} ${className}`}
    >
      <span className={`text-[9px] sm:text-[10px] font-semibold tracking-wide ${styles.text}`}>{styles.label}</span>
      <div className="relative h-12 w-12 sm:h-14 sm:w-14">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            strokeWidth={5}
            className="stroke-black/[0.06] dark:stroke-white/[0.06]"
          />
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className={`transition-[stroke-dashoffset] duration-700 ease-out ${styles.stroke}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
          <span className="text-xs sm:text-sm font-bold text-text-primary dark:text-dark-text tabular-nums">
            {Math.round(current)}
          </span>
          <span className="text-[8px] sm:text-[9px] font-normal text-text-secondary dark:text-dark-text-secondary tabular-nums">
            {target != null ? `/${Math.round(target)}${styles.unit}` : styles.unit}
          </span>
        </div>
      </div>
      <span className="text-[9px] sm:text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
        ({Math.round(percent)}%)
      </span>
    </div>
  );
}
