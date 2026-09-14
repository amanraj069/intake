"use client";

interface MacroRingProps {
  /** Current value in grams. */
  value: number;
  /** Label above the ring: "Protein", "Carbs", or "Fat". */
  label: string;
  /** Ring stroke colour (Tailwind-compatible CSS value). */
  color: string;
  /** Background colour behind the ring. */
  bgColor: string;
  /** Percentage this macro contributes to the meal's total macros. */
  percent: number;
}

const RING_RADIUS = 28;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * A small circular progress ring that visualises one macronutrient.
 * The ring fills to `percent` %, and the centre shows the gram value.
 */
export default function MacroRing({ value, label, color, bgColor, percent }: MacroRingProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const dashOffset = RING_CIRCUMFERENCE - (clampedPercent / 100) * RING_CIRCUMFERENCE;

  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 sm:flex-none sm:px-4 sm:py-3"
      style={{ backgroundColor: bgColor }}
    >
      <span className="text-[10px] font-semibold tracking-wide" style={{ color }}>
        {label}
      </span>
      <div className="relative h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem]">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          {/* track */}
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
            className="text-white/[0.06]"
          />
          {/* fill */}
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-dark-text leading-none">
            {Math.round(value * 10) / 10}
            <span className="text-[10px] font-normal text-dark-text-secondary"> g</span>
          </span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-dark-text-secondary">
        ({Math.round(clampedPercent)}%)
      </span>
    </div>
  );
}
