import { type ComponentType, type ReactNode, type SVGProps } from "react";

export interface CardPlacement {
  /** Left, top, and width in container-width units (cqw), so the whole scene scales like an image. */
  left: number;
  top: number;
  width: number;
  rotate: number;
}

interface SourceCardProps {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  placement: CardPlacement;
  delayMs?: number;
  isHovered?: boolean;
  isDimmed?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  children: ReactNode;
}

/** One way into Intake: a tilted card with its icon, name, and a glimpse of the input. */
export default function SourceCard({
  label,
  Icon,
  placement,
  delayMs = 0,
  isHovered = false,
  isDimmed = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
  children,
}: SourceCardProps) {
  const { left, top, width, rotate } = placement;

  // Dynamic transform on hover:
  // - Lift upward: translateY(-2cqw)
  // - Gentle un-tilt towards 0deg for a direct, tactile "presented to the user" feel
  // - Smooth scale: 1.06
  const activeRotate = isHovered ? rotate * 0.25 : rotate;
  const activeTranslateY = isHovered ? -2 : 0;
  const activeScale = isHovered ? 1.06 : isDimmed ? 0.96 : 1;

  return (
    <div
      className="absolute animate-flow-card"
      style={{
        left: `${left}cqw`,
        top: `${top}cqw`,
        width: `${width}cqw`,
        animationDelay: `${delayMs}ms`,
        zIndex: isHovered ? 35 : isDimmed ? 5 : 15,
      }}
    >
      {/* Ambient glowing backlight on hover */}
      <div
        className={`pointer-events-none absolute -inset-[1cqw] rounded-[4.5cqw] bg-accent/10 dark:bg-accent-dark/16 blur-[1.4cqw] transition-all duration-300 -z-10 ${
          isHovered ? "opacity-100 scale-105" : "opacity-0 scale-95"
        }`}
        aria-hidden="true"
      />

      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`${label} entry method`}
        className={`group relative flex flex-col items-center rounded-[3.5cqw] p-[2.2cqw] cursor-pointer select-none
          border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu
          ${
            isHovered
              ? "border-accent dark:border-accent-dark bg-bg-card dark:bg-dark-bg-card shadow-[0_22px_45px_-10px_rgba(59,122,87,0.35),0_0_14px_rgba(59,122,87,0.12)] dark:shadow-[0_24px_50px_-10px_rgba(0,0,0,0.85),0_0_16px_rgba(54,138,98,0.22)]"
              : "border-border/60 dark:border-dark-border bg-bg-card dark:bg-dark-bg-card shadow-[0_12px_32px_-12px_rgba(41,37,36,0.28)] dark:shadow-none"
          }
        `}
        style={{
          transform: `translate3d(0, ${activeTranslateY}cqw, 0) rotate(${activeRotate}deg) scale(${activeScale})`,
          opacity: isDimmed ? 0.65 : 1,
        }}
      >
        <Icon
          className={`h-[5cqw] w-[5cqw] transition-all duration-300 ease-out ${
            isHovered
              ? "scale-110 text-accent-hover dark:text-accent-dark-hover drop-shadow-[0_2px_6px_rgba(59,122,87,0.28)]"
              : "text-accent dark:text-accent-dark"
          }`}
        />
        <p
          className={`mt-[1cqw] text-[3cqw] transition-colors duration-200 ${
            isHovered
              ? "font-bold text-text-primary dark:text-white"
              : "font-semibold text-text-primary dark:text-dark-text"
          }`}
        >
          {label}
        </p>
        <div className="mt-[1.6cqw] w-full">{children}</div>
      </div>
    </div>
  );
}
