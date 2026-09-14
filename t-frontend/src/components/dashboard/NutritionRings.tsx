"use client";

import { useEffect, useRef, useState } from "react";
import { formatAmount } from "@/lib/formatNumber";
import { colourFor } from "@/lib/metricColours";
import type { NutritionMetricKey } from "@/lib/nutritionMetrics";

/* ─── Ring configuration ──────────────────────────────────────────── */

interface RingDef {
  key: NutritionMetricKey;
  label: string;
  unit: string;
  radius: number;
}

const RING_DEFS: RingDef[] = [
  { key: "calories", label: "Calories", unit: "kcal", radius: 170 },
  { key: "protein",  label: "Protein",  unit: "g",    radius: 142 },
  { key: "carbs",    label: "Carbs",    unit: "g",    radius: 114 },
  { key: "fat",      label: "Fat",      unit: "g",    radius: 86  },
];

const STROKE_WIDTH = 20;
const VIEWBOX = 400;

/* ─── Prop types ──────────────────────────────────────────────────── */

export interface MetricPair {
  consumed: number;
  target: number | null;
}

interface NutritionRingsProps {
  calories: MetricPair;
  protein: MetricPair;
  carbs: MetricPair;
  fat: MetricPair;
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function circumference(radius: number): number {
  return 2 * Math.PI * radius;
}

function clampedPercent(consumed: number, target: number | null): number {
  if (target === null || target <= 0) return 0;
  return Math.min(consumed / target, 1);
}

function pctLabel(consumed: number, target: number | null): string {
  if (target === null || target <= 0) return "—";
  return `${Math.round((consumed / target) * 100)}%`;
}

/* ─── Component ───────────────────────────────────────────────────── */

export default function NutritionRings({ calories, protein, carbs, fat }: NutritionRingsProps) {
  const pairs: MetricPair[] = [calories, protein, carbs, fat];

  /* Animate on mount: progress from 0 → actual over ~700ms. */
  const [animProgress, setAnimProgress] = useState(0);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }

    if (prefersReducedMotion.current) {
      setAnimProgress(1);
      return;
    }

    const start = performance.now();
    const duration = 700;
    let rafId: number;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimProgress(eased);
      if (t < 1) rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  /* Build aria-label summary. */
  const ariaSegments = RING_DEFS.map((def, i) => {
    const p = pairs[i];
    return p.target
      ? `${pctLabel(p.consumed, p.target)} of ${def.label.toLowerCase()} goal`
      : `${formatAmount(p.consumed)} ${def.unit} ${def.label.toLowerCase()}, no target`;
  }).join(", ");

  return (
    <div className="flex flex-col items-center gap-3.5 sm:gap-4 w-full">
      {/* ── Rings SVG ────────────────────────────────────────────── */}
      <div
        className="w-[275px] h-[275px] max-w-full sm:w-[290px] sm:h-[290px] lg:w-[310px] lg:h-[310px]"
        role="img"
        aria-label={ariaSegments}
      >
        <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="w-full h-full">
          <g transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}>
            {RING_DEFS.map((def, i) => {
              const circ = circumference(def.radius);
              const pct = clampedPercent(pairs[i].consumed, pairs[i].target);
              const dashOffset = circ - circ * pct * animProgress;
              const colour = colourFor(def.key);
              // The empty state (no meals logged) shows only the track, so it
              // borrows the ring's own muted tint rather than flat gray - the
              // four rings read as distinct macros even before anything fills in.
              const trackClasses = `${colour.mutedText} dark:${colour.darkMutedText}`;

              return (
                <g key={def.key}>
                  {/* Track */}
                  <circle
                    cx={VIEWBOX / 2}
                    cy={VIEWBOX / 2}
                    r={def.radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={STROKE_WIDTH}
                    className={trackClasses}
                    opacity={0.25}
                  />
                  {/* Progress arc */}
                  <circle
                    cx={VIEWBOX / 2}
                    cy={VIEWBOX / 2}
                    r={def.radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={dashOffset}
                    className={`${colour.text} dark:${colour.darkText}`}
                    style={{ transition: prefersReducedMotion.current ? "none" : undefined }}
                  />
                </g>
              );
            })}
          </g>

          {/* Center text */}
          <text
            x={VIEWBOX / 2}
            y={VIEWBOX / 2 - 8}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-text-primary dark:fill-dark-text"
            style={{ fontSize: 48, fontWeight: 800 }}
          >
            {formatAmount(calories.consumed)}
          </text>
          <text
            x={VIEWBOX / 2}
            y={VIEWBOX / 2 + 30}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-text-secondary dark:fill-dark-text-secondary"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            {calories.target ? `of ${formatAmount(calories.target)} kcal` : "No target"}
          </text>
        </svg>
      </div>

      {/* ── 2x2 Metric Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
        {RING_DEFS.map((def, i) => {
          const p = pairs[i];
          const colour = colourFor(def.key);
          return (
            <div
              key={def.key}
              className="flex items-center justify-between rounded-xl bg-bg-surface dark:bg-dark-surface px-2.5 py-2 sm:px-3 sm:py-2.5 gap-1.5"
            >
              <div className="flex items-center gap-0 sm:gap-1.5 shrink-0">
                <span
                  className={`hidden sm:inline-block h-2 w-2 rounded-full shrink-0 ${colour.solidBg} dark:${colour.darkSolidBg}`}
                  aria-hidden="true"
                />
                <span
                  className={`text-[11px] sm:text-xs font-semibold ${colour.text} dark:${colour.darkText}`}
                >
                  {def.label}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-text-primary dark:text-dark-text whitespace-nowrap text-right tabular-nums">
                {formatAmount(p.consumed)}
                <span className="text-text-secondary dark:text-dark-text-secondary font-normal text-[10px] sm:text-[11px]">
                  {" / "}
                  {p.target !== null ? `${formatAmount(p.target)}${def.unit}` : `—${def.unit}`}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
