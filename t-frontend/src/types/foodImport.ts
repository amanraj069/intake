import type { FoodItemUnit, MealType } from "./nutrition";

/** One food on a diary line as read from the PDF. Anything the diary left blank is null. */
export interface ImportItemValues {
  name: string | null;
  quantity: number | null;
  unit: FoodItemUnit;
  calories: number | null;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
}

/** One diary line: when and at which meal, and the foods on it. */
export interface ImportRowValues {
  date: string | null;
  mealType: MealType | null;
  /** The meal's name as the diary line gives it; null means "call it by its items". */
  name: string | null;
  items: ImportItemValues[];
}

export interface ImportPreviewRow {
  /** 1-based position in the document. */
  rowNumber: number;
  /** The diary text the row was read from. */
  sourceText: string;
  values: ImportRowValues;
  status: "ready" | "needs-review";
  /** Why the row needs a look. Empty when the status is `ready`. */
  issues: string[];
}

/** Returned by POST /api/food-entries/import/preview. Nothing has been saved yet. */
export interface FoodDiaryPreview {
  pageCount: number;
  rows: ImportPreviewRow[];
  /** Problems with the document as a whole, rather than with one row. */
  warnings: string[];
}

export interface ImportSkip {
  /** 1-based position in the submitted list. */
  row: number;
  /** The entry's item names, e.g. "Roti + Paneer sabji". */
  label: string | null;
  reason: "invalid" | "duplicate";
  message: string;
}

/** Returned by POST /api/food-entries/import/confirm. */
export interface FoodEntryImportResult {
  importedCount: number;
  skipped: ImportSkip[];
}
