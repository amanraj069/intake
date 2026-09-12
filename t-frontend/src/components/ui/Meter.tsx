"use client";

interface MeterProps {
  /** Percentage of target reached. Null when no target exists to measure against. */
  percent: number | null;
  /** Read out in place of the bar, which carries no text of its own. */
  ariaLabel: string;
  /** Optional colour class for the fill bar (e.g. "bg-protein dark:bg-dark-protein"). */
  colourClass?: string;
}

/**
 * A hairline progress rail. The fill clamps at the full width so an overshoot
 * cannot run past the track; the accent colour is what marks it instead, which
 * keeps the accent meaning exactly one thing across the app.
 */
export default function Meter({ percent, ariaLabel, colourClass }: MeterProps) {
  const isOverTarget = percent !== null && percent > 100;

  const fillClass =
    colourClass ??
    (isOverTarget ? "bg-accent dark:bg-accent-dark" : "bg-text-primary dark:bg-dark-text");

  return (
    <div
      className="h-[3px] w-full bg-black/10 dark:bg-white/10"
      role="img"
      aria-label={ariaLabel}
    >
      <div
        className={`h-full transition-[width] duration-300 ease-out ${fillClass}`}
        style={{ width: `${Math.min(100, Math.max(0, percent ?? 0))}%` }}
      />
    </div>
  );
}

