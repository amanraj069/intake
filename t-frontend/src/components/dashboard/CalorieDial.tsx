"use client";

import { formatAmount } from "@/lib/formatNumber";

/**
 * A tick dial rather than a smooth ring: square-ended marks on a circle read as
 * an instrument, which suits the type-led language better than a soft arc, and
 * the discrete steps make a glance readable without a printed percentage.
 */
const TICK_COUNT = 48;
const VIEWBOX_SIZE = 200;
const CENTER = VIEWBOX_SIZE / 2;
const TICK_OUTER_RADIUS = 94;
const TICK_INNER_RADIUS = 80;

interface TickGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Tick positions never change, so they are computed once at module load. */
const TICKS: TickGeometry[] = Array.from({ length: TICK_COUNT }, (_, index) => {
  // Starts at twelve o'clock and runs clockwise, the direction a dial is read.
  const angle = (index / TICK_COUNT) * 2 * Math.PI - Math.PI / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x1: CENTER + TICK_INNER_RADIUS * cos,
    y1: CENTER + TICK_INNER_RADIUS * sin,
    x2: CENTER + TICK_OUTER_RADIUS * cos,
    y2: CENTER + TICK_OUTER_RADIUS * sin,
  };
});

interface CalorieDialProps {
  calories: number;
  /** Null while the user has no goal, where the dial shows the intake alone. */
  target: number | null;
  percentOfTarget: number | null;
}

/** How many ticks are lit, always leaving one lit once anything is logged. */
function toLitTickCount(percentOfTarget: number | null, calories: number): number {
  if (percentOfTarget === null) return 0;
  if (calories <= 0) return 0;

  const lit = Math.round((Math.min(100, percentOfTarget) / 100) * TICK_COUNT);
  return Math.max(1, lit);
}

export default function CalorieDial({ calories, target, percentOfTarget }: CalorieDialProps) {
  const isOverTarget = percentOfTarget !== null && percentOfTarget > 100;
  const litTickCount = toLitTickCount(percentOfTarget, calories);

  const litClasses = isOverTarget
    ? "text-accent dark:text-accent-dark"
    : "text-calories dark:text-dark-calories";

  return (
    <div className="relative h-44 w-44 sm:h-52 sm:w-52">
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        className="h-full w-full"
        aria-hidden="true"
      >
        {TICKS.map((tick, index) => (
          <line
            key={index}
            {...tick}
            stroke="currentColor"
            strokeWidth={index % 12 === 0 ? 2.5 : 1.5}
            className={
              index < litTickCount ? litClasses : "text-black/15 dark:text-white/15"
            }
          />
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p
          className={`text-4xl sm:text-5xl font-semibold  ${
            isOverTarget ? "text-accent dark:text-accent-dark" : "text-text-primary dark:text-dark-text"
          }`}
        >
          {formatAmount(calories)}
        </p>
        <p className="mt-1 text-[10px] font-bold   text-text-secondary dark:text-dark-text-secondary">
          Kcal
        </p>
        <p className="mt-2 text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">
          {target === null ? "No target" : `of ${formatAmount(target)}`}
        </p>
      </div>
    </div>
  );
}
