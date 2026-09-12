"use client";

import { useState, type FormEvent } from "react";
import AmountInput from "@/components/ui/AmountInput";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import FormSection from "@/components/ui/FormSection";
import { toErrorMessage } from "@/lib/errorMessage";
import { formatLongDate } from "@/lib/formatDate";
import {
  EMPTY_GOAL_FORM,
  GOAL_FIELD_RULES,
  goalToFormValues,
  validateGoalForm,
  type GoalFieldName,
  type GoalFormErrors,
  type GoalFormValues,
} from "@/lib/validation/goalForm";
import type { Goal, GoalInput } from "@/types/nutrition";

const GOAL_FIELD_UNITS: Record<GoalFieldName, string> = {
  dailyCalorieTarget: "kcal",
  proteinTargetG: "g",
  carbTargetG: "g",
  fatTargetG: "g",
  weightGoalKg: "kg",
};

interface GoalFormProps {
  goal: Goal | null;
  saving: boolean;
  onSave: (input: GoalInput) => Promise<void>;
}

export default function GoalForm({ goal, saving, onSave }: GoalFormProps) {
  const [values, setValues] = useState<GoalFormValues>(() =>
    goal ? goalToFormValues(goal) : EMPTY_GOAL_FORM
  );
  const [errors, setErrors] = useState<GoalFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateField(field: GoalFieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const { errors: nextErrors, payload } = validateGoalForm(values);
    setErrors(nextErrors);

    if (!payload) return;

    try {
      await onSave(payload);
    } catch (cause) {
      setSubmitError(toErrorMessage(cause, "Could not save your goal."));
    }
  }

  function renderAmountField(field: GoalFieldName) {
    return (
      <AmountInput
        rule={GOAL_FIELD_RULES[field]}
        unit={GOAL_FIELD_UNITS[field]}
        value={values[field]}
        error={errors[field]}
        disabled={saving}
        onChange={(next) => updateField(field, next)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-12">
      <FormSection
        title="Daily Energy"
        description="How much you intend to eat each day, and the weight you are working towards."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {renderAmountField("dailyCalorieTarget")}
          {renderAmountField("weightGoalKg")}
        </div>
      </FormSection>

      <FormSection title="Macronutrient Targets" description="Grams per day.">
        <div className="grid gap-6 sm:grid-cols-3">
          {renderAmountField("proteinTargetG")}
          {renderAmountField("carbTargetG")}
          {renderAmountField("fatTargetG")}
        </div>
      </FormSection>

      {submitError && <FormError message={submitError} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-t border-black/10 dark:border-white/10 pt-8">
        <p className="text-[10px] font-bold   text-text-secondary dark:text-dark-text-secondary">
          {goal ? `Last updated ${formatLongDate(goal.updatedAt)}` : "No goal set yet"}
        </p>
        <Button type="submit" loading={saving} className="w-full sm:w-auto">
          {goal ? "Update Goal" : "Set Goal"}
        </Button>
      </div>
    </form>
  );
}
