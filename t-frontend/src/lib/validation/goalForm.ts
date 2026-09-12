import type { Goal, GoalInput } from "@/types/nutrition";
import {
  LIMITS,
  collectAmountErrors,
  hasErrors,
  toAmount,
  type AmountRule,
  type FieldErrors,
} from "./amount";

export interface GoalFormValues {
  dailyCalorieTarget: string;
  proteinTargetG: string;
  carbTargetG: string;
  fatTargetG: string;
  weightGoalKg: string;
}

export type GoalFieldName = keyof GoalFormValues;
export type GoalFormErrors = FieldErrors<GoalFieldName>;

export const EMPTY_GOAL_FORM: GoalFormValues = {
  dailyCalorieTarget: "",
  proteinTargetG: "",
  carbTargetG: "",
  fatTargetG: "",
  weightGoalKg: "",
};

/** Keyed by field so the form can look a rule up without a fallible array search. */
export const GOAL_FIELD_RULES: Record<GoalFieldName, AmountRule<GoalFieldName>> = {
  dailyCalorieTarget: {
    field: "dailyCalorieTarget",
    label: "Daily calorie target",
    max: LIMITS.calories,
    required: true,
  },
  proteinTargetG: {
    field: "proteinTargetG",
    label: "Protein target",
    max: LIMITS.macroGrams,
    required: true,
  },
  carbTargetG: {
    field: "carbTargetG",
    label: "Carb target",
    max: LIMITS.macroGrams,
    required: true,
  },
  fatTargetG: { field: "fatTargetG", label: "Fat target", max: LIMITS.macroGrams, required: true },
  weightGoalKg: {
    field: "weightGoalKg",
    label: "Weight goal",
    max: LIMITS.weightKg,
    required: false,
  },
};

/** Turns a saved goal back into editable text so the form can pre-fill. */
export function goalToFormValues(goal: Goal): GoalFormValues {
  return {
    dailyCalorieTarget: String(goal.dailyCalorieTarget),
    proteinTargetG: String(goal.proteinTargetG),
    carbTargetG: String(goal.carbTargetG),
    fatTargetG: String(goal.fatTargetG),
    weightGoalKg: goal.weightGoalKg === undefined ? "" : String(goal.weightGoalKg),
  };
}

export interface GoalValidationResult {
  errors: GoalFormErrors;
  payload?: GoalInput;
}

export function validateGoalForm(values: GoalFormValues): GoalValidationResult {
  const errors = collectAmountErrors(Object.values(GOAL_FIELD_RULES), values);

  if (hasErrors(errors)) {
    return { errors };
  }

  const weightGoal = values.weightGoalKg.trim();

  return {
    errors,
    payload: {
      dailyCalorieTarget: toAmount(values.dailyCalorieTarget),
      proteinTargetG: toAmount(values.proteinTargetG),
      carbTargetG: toAmount(values.carbTargetG),
      fatTargetG: toAmount(values.fatTargetG),
      // Omitted entirely when blank, which clears any previously saved value.
      ...(weightGoal ? { weightGoalKg: toAmount(weightGoal) } : {}),
    },
  };
}
