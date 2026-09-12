"use client";

/** How one nutrient's intake compares with its target. */
export interface NutrientProgressProps {
  label: string;
  unit: string;
  actual: number;
  /** Null when no goal has been set, so only the actual value is meaningful. */
  target: number | null;
}

function formatAmount(value: number, unit: string): string {
  return `${Number(value.toFixed(1))} ${unit}`;
}

function toPercentage(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

/**
 * A label-value pair with a hairline meter beneath it. The accent colour marks
 * an overshoot and nothing else, so a glance finds what is off target.
 */
export default function NutrientProgress({ label, unit, actual, target }: NutrientProgressProps) {
  const percentage = target === null ? null : toPercentage(actual, target);
  const isOverTarget = percentage !== null && percentage > 100;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-medium ${
          isOverTarget
            ? "text-accent dark:text-accent-dark"
            : "text-text-primary dark:text-dark-text"
        }`}
      >
        {formatAmount(actual, unit)}
      </p>

      <p className="mt-1 text-xs font-light text-text-secondary dark:text-dark-text-secondary">
        {target === null ? "No target set" : `of ${formatAmount(target, unit)} - ${percentage}%`}
      </p>

      <div
        className="mt-3 h-[3px] w-full bg-black/10 dark:bg-white/10"
        role="img"
        aria-label={
          target === null
            ? `${label}: ${formatAmount(actual, unit)}, no target set`
            : `${label}: ${percentage}% of target`
        }
      >
        <div
          className={`h-full ${
            isOverTarget ? "bg-accent dark:bg-accent-dark" : "bg-text-primary dark:bg-dark-text"
          }`}
          style={{ width: `${Math.min(100, percentage ?? 0)}%` }}
        />
      </div>
    </div>
  );
}
