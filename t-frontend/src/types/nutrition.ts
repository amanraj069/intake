export const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type FoodEntrySource = "manual" | "ai-image" | "pdf-import" | "ai-chat";

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

/**
 * How an item is measured: grams for weighed food, millilitres for liquids, and a
 * count for pieces (rotis, eggs, slices), with the item's name saying what is counted.
 */
export const FOOD_ITEM_UNITS = ["g", "ml", "count"] as const;
export type FoodItemUnit = (typeof FOOD_ITEM_UNITS)[number];

/** One component of a meal, with the nutrition of exactly that quantity. */
export interface FoodItem {
  name: string;
  quantity: number;
  unit: FoodItemUnit;
  calories: number;
  macros: Macros;
  micros: Micronutrients;
}

export interface FoodEntry {
  _id: string;
  userId: string;
  mealType: MealType;
  /** What the whole meal is called, e.g. "Roti sabji". The server fills it from the items when none is given. */
  name: string;
  items: FoodItem[];
  /** Sum of every item's calories, computed by the server. */
  calories: number;
  /** Sum of every item's macros, computed by the server. */
  macros: Macros;
  /** Every item's micronutrients summed per nutrient, computed by the server. */
  micros: Micronutrients;
  date: string;
  time?: string;
  source: FoodEntrySource;
  confidenceScore?: number;
  confidenceLevel?: ConfidenceLevel;
  extractionAnalysis?: ExtractionAnalysis;
  imageUrl?: string;
  imagePublicId?: string;
  createdAt: string;
  updatedAt: string;
}

export type FoodItemInput = Omit<FoodItem, "micros"> & { micros?: Micronutrients };

/** What create and update send. Totals are never sent: the server sums them from the items. */
export interface FoodEntryInput {
  mealType: MealType;
  /** Omitted or blank means "call it by its items". */
  name?: string;
  items: FoodItemInput[];
  date: string;
  time?: string;
  source?: FoodEntrySource;
  confidenceScore?: number;
  confidenceLevel?: ConfidenceLevel;
  extractionAnalysis?: ExtractionAnalysis;
  imageUrl?: string;
  imagePublicId?: string;
}

/** The items of an entry, as read from a photo. When and at which meal are the user's call. */
export type FoodEntryDraft = Pick<FoodEntryInput, "name" | "items">;

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

