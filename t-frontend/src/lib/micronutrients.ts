export interface MicronutrientOption {
  value: string;
  label: string;
  category: "Vitamins" | "Minerals" | "Other";
}

export const POPULAR_MICRONUTRIENTS: readonly string[] = [
  "Vitamin D",
  "Vitamin C",
  "Vitamin B12",
  "Iron",
  "Calcium",
  "Magnesium",
  "Zinc",
  "Potassium",
  "Sodium",
];

export const MICRONUTRIENT_OPTIONS: readonly MicronutrientOption[] = [
  // Vitamins
  { value: "Vitamin A", label: "Vitamin A", category: "Vitamins" },
  { value: "Vitamin B1 (Thiamine)", label: "Vitamin B1 (Thiamine)", category: "Vitamins" },
  { value: "Vitamin B2 (Riboflavin)", label: "Vitamin B2 (Riboflavin)", category: "Vitamins" },
  { value: "Vitamin B3 (Niacin)", label: "Vitamin B3 (Niacin)", category: "Vitamins" },
  { value: "Vitamin B5 (Pantothenic Acid)", label: "Vitamin B5 (Pantothenic Acid)", category: "Vitamins" },
  { value: "Vitamin B6", label: "Vitamin B6", category: "Vitamins" },
  { value: "Vitamin B7 (Biotin)", label: "Vitamin B7 (Biotin)", category: "Vitamins" },
  { value: "Vitamin B9 (Folate)", label: "Vitamin B9 (Folate)", category: "Vitamins" },
  { value: "Vitamin B12", label: "Vitamin B12", category: "Vitamins" },
  { value: "Vitamin C", label: "Vitamin C", category: "Vitamins" },
  { value: "Vitamin D", label: "Vitamin D", category: "Vitamins" },
  { value: "Vitamin E", label: "Vitamin E", category: "Vitamins" },
  { value: "Vitamin K", label: "Vitamin K", category: "Vitamins" },

  // Minerals & Electrolytes
  { value: "Calcium", label: "Calcium", category: "Minerals" },
  { value: "Chromium", label: "Chromium", category: "Minerals" },
  { value: "Copper", label: "Copper", category: "Minerals" },
  { value: "Iodine", label: "Iodine", category: "Minerals" },
  { value: "Iron", label: "Iron", category: "Minerals" },
  { value: "Magnesium", label: "Magnesium", category: "Minerals" },
  { value: "Manganese", label: "Manganese", category: "Minerals" },
  { value: "Molybdenum", label: "Molybdenum", category: "Minerals" },
  { value: "Phosphorus", label: "Phosphorus", category: "Minerals" },
  { value: "Potassium", label: "Potassium", category: "Minerals" },
  { value: "Selenium", label: "Selenium", category: "Minerals" },
  { value: "Sodium", label: "Sodium", category: "Minerals" },
  { value: "Zinc", label: "Zinc", category: "Minerals" },

  // Other Common Nutrients & Compounds
  { value: "Choline", label: "Choline", category: "Other" },
  { value: "Omega-3", label: "Omega-3 (EPA / DHA)", category: "Other" },
  { value: "CoQ10", label: "CoQ10", category: "Other" },
];

/** Matches raw nutrient names (e.g. "vitaminC", "iron", "VITAMIN D") to standard option value. */
export function matchStandardNutrient(rawName: string): string | null {
  if (!rawName) return null;
  const trimmed = rawName.trim();
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const opt of MICRONUTRIENT_OPTIONS) {
    const optNorm = opt.value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === optNorm) {
      return opt.value;
    }
  }

  return null;
}
