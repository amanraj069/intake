type Point = readonly [number, number];

interface FlowArrow {
  path: string;
  /** Each head is drawn at `tip`, pointing away from `from` (usually the curve's last control point). */
  heads: readonly { tip: Point; from: Point }[];
}

const HEAD_LENGTH = 1.8;
const HEAD_SPREAD = Math.PI / 6;

/** Coordinates share the scene's cqw grid: 100 wide by 88 tall. */
const ARROWS: readonly FlowArrow[] = [
  { path: "M35.25 34 C35.25 43 44 42 45 50.5", heads: [{ tip: [45, 50.5], from: [44, 42] }] },
  { path: "M64.75 34 C64.75 43 56 42 55 50.5", heads: [{ tip: [55, 50.5], from: [56, 42] }] },
  {
    path: "M12 48 Q15 56 29.5 56.5",
    heads: [
      { tip: [12, 48], from: [15, 56] },
      { tip: [29.5, 56.5], from: [15, 56] },
    ],
  },
  {
    path: "M88 48 Q85 56 70.5 56.5",
    heads: [
      { tip: [88, 48], from: [85, 56] },
      { tip: [70.5, 56.5], from: [85, 56] },
    ],
  },
  { path: "M50 62.5 L50 67.5", heads: [{ tip: [50, 67.5], from: [50, 62.5] }] },
];

function chevronPath({ tip, from }: { tip: Point; from: Point }): string {
  const angle = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const wing = (offset: number) =>
    `${tip[0] - HEAD_LENGTH * Math.cos(angle + offset)} ${tip[1] - HEAD_LENGTH * Math.sin(angle + offset)}`;
  return `M${wing(HEAD_SPREAD)} L${tip[0]} ${tip[1]} L${wing(-HEAD_SPREAD)}`;
}

export type ActiveSource = "Photo" | "Chat" | "Manual" | "PDF" | null;

interface FlowArrowsProps {
  activeSource?: ActiveSource;
}

export default function FlowArrows({ activeSource = null }: FlowArrowsProps) {
  return (
    <svg
      viewBox="0 0 100 88"
      className="absolute inset-0 h-full w-full pointer-events-none animate-fade-in delay-250"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="arrow-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#34D399" floodOpacity="0.75" />
        </filter>
      </defs>
      {ARROWS.map((arrow, index) => {
        const isSourceArrow =
          (activeSource === "Chat" && index === 0) ||
          (activeSource === "Manual" && index === 1) ||
          (activeSource === "Photo" && index === 2) ||
          (activeSource === "PDF" && index === 3);

        const isDownstreamArrow = activeSource !== null && index === 4;
        const isActive = isSourceArrow || isDownstreamArrow;
        const isDimmed = activeSource !== null && !isActive;

        return (
          <g
            key={arrow.path}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            filter={isActive ? "url(#arrow-glow)" : undefined}
            strokeWidth={isActive ? 2.4 : isDimmed ? 1.2 : 1.5}
            className={`transition-all duration-300 ease-out ${
              isActive
                ? "stroke-accent dark:stroke-[#34D399] opacity-100"
                : isDimmed
                ? "stroke-accent/20 dark:stroke-accent-dark/20 opacity-30"
                : "stroke-accent/45 dark:stroke-accent-dark/55 opacity-100"
            }`}
          >
            <path d={arrow.path} vectorEffect="non-scaling-stroke" />
            {arrow.heads.map((head) => (
              <path key={`${head.tip}`} d={chevronPath(head)} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
