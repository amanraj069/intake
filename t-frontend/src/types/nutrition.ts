export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type FoodEntrySource = "manual" | "ai-image";

export interface Goal {
  _id: string;
  userId: string;
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbTargetG: number;
  fatTargetG: number;
  weightGoalKg?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbTargetG: number;
  fatTargetG: number;
  weightGoalKg?: number;
}

export interface Macros {
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** Nutrient name to amount. Open-ended: the tracked set varies per food. */
export type Micronutrients = Record<string, number>;

export interface FoodEntry {
  _id: string;
  userId: string;
  mealType: MealType;
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  macros: Macros;
  micros: Micronutrients;
  date: string;
  source: FoodEntrySource;
  createdAt: string;
  updatedAt: string;
}

export interface FoodEntryInput {
  mealType: MealType;
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  macros: Macros;
  micros?: Micronutrients;
  date: string;
  source?: FoodEntrySource;
}
