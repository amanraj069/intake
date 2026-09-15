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
  children: ReactNode;
}

/** One way into Intake: a tilted card with its icon, name, and a glimpse of the input. */
export default function SourceCard({ label, Icon, placement, delayMs = 0, children }: SourceCardProps) {
  const { left, top, width, rotate } = placement;

  return (
    <div
      className="absolute flex flex-col items-center rounded-[3.5cqw] border border-border/60 dark:border-dark-border bg-bg-card dark:bg-dark-bg-card p-[2.2cqw] shadow-[0_12px_32px_-12px_rgba(41,37,36,0.28)] dark:shadow-none transition-[translate] duration-200 hover:-translate-y-[1cqw] animate-flow-card"
      style={{
        left: `${left}cqw`,
        top: `${top}cqw`,
        width: `${width}cqw`,
        transform: `rotate(${rotate}deg)`,
        animationDelay: `${delayMs}ms`,
      }}
    >
      <Icon className="h-[5cqw] w-[5cqw] text-accent dark:text-accent-dark" />
      <p className="mt-[1cqw] text-[3cqw] font-semibold text-text-primary dark:text-dark-text">{label}</p>
      <div className="mt-[1.6cqw] w-full">{children}</div>
    </div>
  );
}
