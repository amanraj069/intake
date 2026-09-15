"use client";

import { type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { AppleIcon, BowlIcon, CoffeeIcon, MoonIcon } from "@/components/icons";
import {
  NUTRITION_METRICS,
  targetFor,
} from "@/lib/nutritionMetrics";
import type { DailyIntakeSummary, MealType } from "@/types/nutrition";
import NutritionRings from "./NutritionRings";

/* ─── Meal slot definitions ───────────────────────────────────────── */

interface MealSlotDef {
  type: MealType;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const MEAL_SLOTS: MealSlotDef[] = [
  { type: "breakfast", label: "Breakfast", Icon: CoffeeIcon },
  { type: "lunch",     label: "Lunch",     Icon: BowlIcon },
  { type: "snack",     label: "Snacks",    Icon: AppleIcon },
  { type: "dinner",    label: "Dinner",    Icon: MoonIcon },
];

/* ─── Sub-components ──────────────────────────────────────────────── */

function MealSlot({ slot, logged }: { slot: MealSlotDef; logged: boolean }) {
  const Icon = slot.Icon;
  return (
    <Link
      href={`/log-meal?mealType=${slot.type}`}
      className="group flex items-center gap-3 rounded-xl bg-bg-surface dark:bg-dark-surface px-3.5 py-2.5 sm:px-4 sm:py-3"
    >
      <Icon
        className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 text-text-secondary dark:text-dark-text-secondary"
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text">
          {slot.label}
        </p>
        <p className="text-[11px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary">
          {logged ? "Logged" : "Not logged"}
        </p>
      </div>

      <span className="text-accent dark:text-accent-dark text-lg sm:text-xl font-medium transition-transform duration-300 group-hover:translate-x-1 pr-1">
        {logged ? "→" : "+"}
      </span>
    </Link>
  );
}

function PanelFooter({ summary }: { summary: DailyIntakeSummary }) {
  if (summary.goal) return null;
  return (
    <footer className="border-t border-border dark:border-dark-border mt-6 pt-5 sm:mt-10 sm:pt-8 flex justify-center">
      <Link href="/goals" className="w-full sm:w-auto">
        <Button variant="secondary" size="sm" className="w-full">
          Set Daily Goal
        </Button>
      </Link>
    </footer>
  );
}

/* ─── Main panel ──────────────────────────────────────────────────── */

interface TodayPanelProps {
  summary: DailyIntakeSummary;
}

/** Today's intake: concentric rings left, meal slots right. */
export default function TodayPanel({ summary }: TodayPanelProps) {
  const caloriesMetric = NUTRITION_METRICS.calories;
  const proteinMetric = NUTRITION_METRICS.protein;
  const carbsMetric = NUTRITION_METRICS.carbs;
  const fatMetric = NUTRITION_METRICS.fat;

  return (
    <section
      aria-label="Today against target"
      className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-4 sm:p-10 lg:p-12"
    >
      <div className="grid gap-6 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 items-center">
        {/* Left: Nutrition rings */}
        <div className="flex flex-col items-center w-full lg:pr-8 lg:border-r border-border dark:border-dark-border">
          <NutritionRings
            calories={{
              consumed: caloriesMetric.actualOf(summary.totals),
              target: targetFor(caloriesMetric, summary.goal),
            }}
            protein={{
              consumed: proteinMetric.actualOf(summary.totals),
              target: targetFor(proteinMetric, summary.goal),
            }}
            carbs={{
              consumed: carbsMetric.actualOf(summary.totals),
              target: targetFor(carbsMetric, summary.goal),
            }}
            fat={{
              consumed: fatMetric.actualOf(summary.totals),
              target: targetFor(fatMetric, summary.goal),
            }}
          />
        </div>

        {/* Right: Meal slots */}
        <div>
          <p className="text-[11px] sm:text-xs font-bold tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary mb-3 sm:mb-5 uppercase">
            Today&apos;s Meals
          </p>
          <div className="flex flex-col gap-2 sm:gap-3">
            {MEAL_SLOTS.map((slot) => (
              <MealSlot key={slot.type} slot={slot} logged={summary.totals.loggedMeals?.includes(slot.type) ?? false} />
            ))}
          </div>
        </div>
      </div>

      <PanelFooter summary={summary} />
    </section>
  );
}
