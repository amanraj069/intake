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
  confidenceScore?: number;
  confidenceLevel?: ConfidenceLevel;
  extractionAnalysis?: ExtractionAnalysis;
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
  confidenceScore?: number;
  confidenceLevel?: ConfidenceLevel;
  extractionAnalysis?: ExtractionAnalysis;
}

/** The nutrition fields of an entry, as read from a photo. When and at which meal are the user's call. */
export type FoodEntryDraft = Pick<
  FoodEntryInput,
  "foodName" | "quantity" | "quantityUnit" | "calories" | "macros" | "micros"
>;

export type ConfidenceLevel = "high" | "medium" | "low";

/** One scored question behind the overall confidence, such as "do we know the portion?". */
export interface ConfidenceFactor {
  key: "foodIdentity" | "portionSize" | "nutrientValues" | "imageQuality";
  label: string;
  /** 0 to 100. */
  score: number;
  /** Share of the overall score this factor carries, 0 to 1. */
  weight: number;
  reason: string;
}

export interface ExtractionConfidence {
  /** 0 to 95: a reading from one photo is never reported as certain. */
  score: number;
  /** Set by a ladder of visible rules, not by the percentage alone. */
  level: ConfidenceLevel;
  /** Each rule that set or moved the level, in order, e.g. "Down to Medium: unsure what the food is". */
  levelSteps: string[];
  factors: ConfidenceFactor[];
  /** Fixed server-side corrections to the percentage, such as a cap for a label with no product name. */
  adjustments: string[];
}

/** How the AI read the photo, shown beside the draft so the user knows what to double-check. */
export interface ExtractionAnalysis {
  imageKind: "nutrition-label" | "meal";
  confidence: ExtractionConfidence;
  notes: string | null;
  warnings: string[];
}

/** Returned by POST /api/ai/extract-nutrition. Nothing has been saved yet. */
export interface NutritionExtraction {
  extraction: FoodEntryDraft;
  analysis: ExtractionAnalysis;
}

/** Calories and macros summed across every entry on one day. */
export interface DailyNutritionTotals {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  entryCount: number;
  loggedMeals: MealType[];
}

/** One day's intake next to the goal it is measured against. */
export interface DailyIntakeSummary {
  date: string;
  totals: DailyNutritionTotals;
  /** Null until the user has set a goal. */
  goal: Goal | null;
}

/** One day of a series: that day's totals, with the goal carried by the series. */
export interface DailyIntakePoint {
  date: string;
  totals: DailyNutritionTotals;
}

/**
 * Consecutive days of intake with the goal they are measured against. Days with
 * no entries arrive with zeroed totals, so the range is always complete.
 */
export interface DailyIntakeSeries {
  startDate: string;
  endDate: string;
  days: DailyIntakePoint[];
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

// ---------------------------------------------------------------------------
// Report types — returned by /api/reports/*
// ---------------------------------------------------------------------------

export interface WeeklyCaloriePoint {
  date: string;
  totalCalories: number;
}

export interface MacroBreakdownPoint {
  period: string;
  proteinG: number;
  carbG: number;
  fatG: number;
}

export interface MicroSummaryPoint {
  nutrient: string;
  amount: number;
  unit: string;
}

export interface GoalComparisonPoint {
  date: string;
  actualCalories: number;
  targetCalories: number | null;
}

