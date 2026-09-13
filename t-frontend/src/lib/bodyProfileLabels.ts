import type { ActivityLevel, BiologicalSex, BmiCategory } from "@/types/onboarding";

export const SEX_OPTIONS: readonly { value: BiologicalSex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

export const ACTIVITY_OPTIONS: readonly { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary: little or no exercise" },
  { value: "light", label: "Light: exercise 1-3 days a week" },
  { value: "moderate", label: "Moderate: exercise 3-5 days a week" },
  { value: "active", label: "Active: exercise 6-7 days a week" },
  { value: "very-active", label: "Very active: hard daily training or a physical job" },
];

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  underweight: "Underweight",
  healthy: "Healthy range",
  overweight: "Overweight",
  obese: "Obese",
};
