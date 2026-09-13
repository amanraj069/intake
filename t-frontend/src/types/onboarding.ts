export const BIOLOGICAL_SEXES = ["male", "female"] as const;
export type BiologicalSex = (typeof BIOLOGICAL_SEXES)[number];

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very-active"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

/** Body measurements captured at onboarding. Weights in kg, height in cm. */
export interface BodyProfile {
  weightKg: number;
  heightCm: number;
  goalWeightKg: number;
  age: number;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
}

export type BmiCategory = "underweight" | "healthy" | "overweight" | "obese";
export type WeightDirection = "lose" | "maintain" | "gain";

export interface DailyTargets {
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbTargetG: number;
  fatTargetG: number;
}

/** A recommended plan, not yet saved. `formula` means the AI was unavailable. */
export interface NutritionPlan {
  bmi: number;
  bmiCategory: BmiCategory;
  goalBmi: number;
  direction: WeightDirection;
  targets: DailyTargets;
  rationale: string;
  source: "ai" | "formula";
}
