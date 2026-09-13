import type { ActivityLevel, BiologicalSex, BodyProfile } from "@/types/onboarding";

/** Mirrors `bodyProfileSchema` in t-backend/src/schemas/onboarding.schema.ts. Keep the two in sync. */
export interface BodyProfileFormValues {
  weightKg: string;
  heightCm: string;
  goalWeightKg: string;
  age: string;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
}

export type BodyMeasureField = "weightKg" | "heightCm" | "goalWeightKg" | "age";
export type BodyProfileFormErrors = Partial<Record<BodyMeasureField, string>>;

interface MeasureRule {
  label: string;
  unit: string;
  min: number;
  max: number;
  wholeNumber: boolean;
}

export const BODY_MEASURE_RULES: Record<BodyMeasureField, MeasureRule> = {
  weightKg: { label: "Current weight", unit: "kg", min: 30, max: 300, wholeNumber: false },
  heightCm: { label: "Height", unit: "cm", min: 120, max: 230, wholeNumber: false },
  goalWeightKg: { label: "Goal weight", unit: "kg", min: 30, max: 300, wholeNumber: false },
  age: { label: "Age", unit: "years", min: 16, max: 100, wholeNumber: true },
};

export const EMPTY_BODY_PROFILE_FORM: BodyProfileFormValues = {
  weightKg: "",
  heightCm: "",
  goalWeightKg: "",
  age: "",
  sex: "female",
  activityLevel: "moderate",
};

export function profileToFormValues(profile: BodyProfile): BodyProfileFormValues {
  return {
    weightKg: String(profile.weightKg),
    heightCm: String(profile.heightCm),
    goalWeightKg: String(profile.goalWeightKg),
    age: String(profile.age),
    sex: profile.sex,
    activityLevel: profile.activityLevel,
  };
}

function measureError(raw: string, rule: MeasureRule): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return `${rule.label} is required`;

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return `${rule.label} must be a number`;
  if (rule.wholeNumber && !Number.isInteger(value)) return `${rule.label} must be a whole number`;
  if (value < rule.min || value > rule.max) {
    return `${rule.label} must be between ${rule.min} and ${rule.max} ${rule.unit}`;
  }
  return undefined;
}

export interface BodyProfileValidationResult {
  errors: BodyProfileFormErrors;
  profile?: BodyProfile;
}

export function validateBodyProfileForm(values: BodyProfileFormValues): BodyProfileValidationResult {
  const errors: BodyProfileFormErrors = {};

  for (const [field, rule] of Object.entries(BODY_MEASURE_RULES) as [BodyMeasureField, MeasureRule][]) {
    const error = measureError(values[field], rule);
    if (error) errors[field] = error;
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    profile: {
      weightKg: Number(values.weightKg),
      heightCm: Number(values.heightCm),
      goalWeightKg: Number(values.goalWeightKg),
      age: Number(values.age),
      sex: values.sex,
      activityLevel: values.activityLevel,
    },
  };
}
