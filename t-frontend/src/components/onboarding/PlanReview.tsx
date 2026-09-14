"use client";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { NUTRITION_METRICS, NUTRITION_METRIC_KEYS } from "@/lib/nutritionMetrics";
import type { NutritionPlan } from "@/types/onboarding";
import BmiSummary from "./BmiSummary";
import PlanTargetTile from "./PlanTargetTile";

interface PlanReviewProps {
  plan: NutritionPlan;
  saving: boolean;
  onEdit: () => void;
  onAccept: () => void;
}

/** The recommended plan, shown for confirmation before it becomes the user's goal. */
export default function PlanReview({ plan, saving, onEdit, onAccept }: PlanReviewProps) {
  return (
    <div className="space-y-3.5 sm:space-y-6">
      <BmiSummary plan={plan} />

      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs sm:text-sm font-bold text-text-primary dark:text-dark-text">Daily targets</h2>
          <Badge variant={plan.source === "ai" ? "success" : "neutral"} className="rounded-full text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5">
            {plan.source === "ai" ? "Personalised by AI" : "Standard formula"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {NUTRITION_METRIC_KEYS.map((key) => (
            <PlanTargetTile
              key={key}
              metric={NUTRITION_METRICS[key]}
              value={NUTRITION_METRICS[key].targetOf(plan.targets)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs sm:text-sm font-light leading-normal sm:leading-relaxed text-text-secondary dark:text-dark-text-secondary">
        {plan.rationale}
      </p>

      {plan.source === "formula" && (
        <p className="text-xs font-light text-text-secondary dark:text-dark-text-secondary">
          Our AI assistant could not be reached, so these targets come from the Mifflin-St Jeor
          equation. You can fine-tune them any time on the Goals page.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:gap-3 sm:flex-row">
        <Button variant="secondary" onClick={onEdit} disabled={saving} className="sm:flex-1">
          Edit details
        </Button>
        <Button onClick={onAccept} loading={saving} className="sm:flex-1">
          Save & continue
        </Button>
      </div>
    </div>
  );
}
