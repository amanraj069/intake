"use client";

import { BMI_CATEGORY_LABELS } from "@/lib/bodyProfileLabels";
import type { NutritionPlan } from "@/types/onboarding";

interface BmiSummaryProps {
  plan: Pick<NutritionPlan, "bmi" | "bmiCategory" | "goalBmi">;
}

/** Current BMI with its category, and where the goal weight would put it. */
export default function BmiSummary({ plan }: BmiSummaryProps) {
  return (
    <div className="flex items-center justify-between gap-4 sm:gap-6 rounded-xl sm:rounded-2xl bg-bg-card p-3.5 sm:p-5 shadow-sm dark:bg-dark-bg-card border border-border dark:border-dark-border">
      <div>
        <p className="text-[11px] sm:text-xs font-light text-text-secondary dark:text-dark-text-secondary">
          Your BMI
        </p>
        <p className="mt-0.5 sm:mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-text-primary dark:text-dark-text">
          {plan.bmi.toFixed(1)}
        </p>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-text-primary dark:text-dark-text">
          {BMI_CATEGORY_LABELS[plan.bmiCategory]}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[11px] sm:text-xs font-light text-text-secondary dark:text-dark-text-secondary">
          At your goal weight
        </p>
        <p className="mt-0.5 sm:mt-1 text-lg sm:text-xl font-semibold text-text-primary dark:text-dark-text">
          {plan.goalBmi.toFixed(1)}
        </p>
      </div>
    </div>
  );
}
