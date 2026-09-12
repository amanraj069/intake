"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import DataPair from "@/components/ui/DataPair";
import {
  MACRO_METRIC_KEYS,
  NUTRITION_METRICS,
  targetFor,
  toMacroEnergySplit,
} from "@/lib/nutritionMetrics";
import type { DailyIntakeSummary } from "@/types/nutrition";
import CalorieFocus from "./CalorieFocus";
import MacroTile from "./MacroTile";

function PanelFooter({ summary }: { summary: DailyIntakeSummary }) {
  if (summary.goal) return null;
  return (
    <footer className="border-t border-border dark:border-dark-border mt-8 pt-6 flex justify-center">
      <Link href="/goals" className="w-full sm:w-auto">
        <Button variant="secondary" size="sm" className="w-full">
          Set Daily Goal
        </Button>
      </Link>
    </footer>
  );
}

interface TodayPanelProps {
  summary: DailyIntakeSummary;
}

/** Today's intake against target: one cohesive widget containing calorie focus and macros. */
export default function TodayPanel({ summary }: TodayPanelProps) {
  return (
    <section aria-label="Today against target" className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-6 sm:p-8 lg:p-10">
      <div className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-16 items-center">
        {/* Left: Calorie Focus */}
        <div className="flex justify-center lg:justify-start lg:border-r border-border dark:border-dark-border lg:pr-16">
          <div className="w-full max-w-[18rem]">
            <CalorieFocus summary={summary} />
          </div>
        </div>

        {/* Right: Macro Tiles */}
        <div className="flex flex-col justify-center gap-4">
          {MACRO_METRIC_KEYS.map((key) => {
            const metric = NUTRITION_METRICS[key];
            return (
              <MacroTile
                key={key}
                metric={metric}
                actual={metric.actualOf(summary.totals)}
                target={targetFor(metric, summary.goal)}
              />
            );
          })}
        </div>
      </div>

      <PanelFooter summary={summary} />
    </section>
  );
}
