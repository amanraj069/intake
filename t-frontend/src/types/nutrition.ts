export const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;
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

/** Nutrient name to amount and unit. Open-ended: the tracked set varies per food. */
export type Micronutrients = Record<string, { amount: number; unit: string }>;

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

/** Calories and macros summed across every entry on one day. */
export interface DailyNutritionTotals {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  entryCount: number;
}

/** One day's intake next to the goal it is measured against. */
export interface DailyIntakeSummary {
  date: string;
  totals: DailyNutritionTotals;
  /** Null until the user has set a goal. */
  goal: Goal | null;
}

/** Everything the meals list sends to the API: the filters plus the page wanted. */
export interface FoodEntryQuery {
  startDate?: string;
  endDate?: string;
  mealType?: MealType;
  page?: number;
  limit?: number;
}

/** Where a returned page sits within the full result set. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
