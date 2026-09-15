import { isRealCalendarDay } from './calendarDay';
import { MAX_ENTRY_NAME_LENGTH } from './foodEntryName';
import { AiDiaryItem, AiDiaryRow } from './foodDiaryImportPrompt';
import { roundToTenth } from './numbers';
import { FoodItemUnit, MealType } from '../models/FoodEntry';
import { MAX_ITEMS_PER_ENTRY, createFoodEntrySchema } from '../schemas/foodEntry.schema';

const CALENDAR_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** One food on a row. Anything the PDF did not give is null, so the table shows an empty cell, not a made-up number. */
export interface ImportItemValues {
  name: string | null;
  quantity: number | null;
  unit: FoodItemUnit;
  calories: number | null;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
}

export interface ImportRowValues {
  date: string | null;
  mealType: MealType | null;
  /** The meal's name as the diary line gives it; null means "call it by its items". */
  name: string | null;
  items: ImportItemValues[];
}

export type ImportRowStatus = 'ready' | 'needs-review';

export interface ImportPreviewRow {
  /** 1-based position in the document, so issues can refer to "row 4". */
  rowNumber: number;
  sourceText: string;
  values: ImportRowValues;
  status: ImportRowStatus;
  /** Why the row needs a look. Empty exactly when the status is `ready`. */
  issues: string[];
}

const roundOrNull = (value: number | null) => (value === null ? null : roundToTenth(value));

function toCalendarDay(date: string | null): string | null {
  if (!date || !CALENDAR_DAY_PATTERN.test(date) || !isRealCalendarDay(date)) return null;
  return date;
}

function toItemValues(item: AiDiaryItem): ImportItemValues {
  return {
    name: item.name || null,
    quantity: roundOrNull(item.quantity),
    unit: item.unit,
    calories: item.calories === null ? null : Math.round(item.calories),
    proteinG: roundOrNull(item.proteinG),
    carbG: roundOrNull(item.carbG),
    fatG: roundOrNull(item.fatG),
  };
}

function toValues(row: AiDiaryRow): ImportRowValues {
  return {
    date: toCalendarDay(row.date),
    mealType: row.mealType,
    name: row.name ? row.name.slice(0, MAX_ENTRY_NAME_LENGTH) : null,
    items: row.items.slice(0, MAX_ITEMS_PER_ENTRY).map(toItemValues),
  };
}

/** "Roti", "Roti and Dal" or "Roti, Dal and Rice", for naming the items an issue is about. */
function listNames(items: readonly ImportItemValues[]): string {
  const names = items.map((item, index) => item.name ?? `item ${index + 1}`);
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

function findMissingValueIssues(values: ImportRowValues): string[] {
  const issues: string[] = [];
  const { items } = values;

  if (!values.date) issues.push('No date found for this row. Choose the day it was eaten.');
  if (!values.mealType) issues.push('No meal found for this row. Choose one.');
  if (items.length === 0) return [...issues, 'No food could be read on this line. Add the items, or remove the row.'];

  const unnamed = items.filter((item) => !item.name);
  const noQuantity = items.filter((item) => item.quantity === null);
  const noCalories = items.filter((item) => item.calories === null);
  const noMacros = items.filter((item) => [item.proteinG, item.carbG, item.fatG].some((value) => value === null));

  if (unnamed.length > 0) issues.push(`The name of ${listNames(unnamed)} could not be read.`);
  if (noQuantity.length > 0) issues.push(`The amount of ${listNames(noQuantity)} is missing.`);
  if (noCalories.length > 0) issues.push(`Calories for ${listNames(noCalories)} could not be read.`);
  if (noMacros.length > 0) {
    issues.push(`Protein, carbs or fat for ${listNames(noMacros)} are missing in the PDF. Enter them, or 0 if unknown.`);
  }

  return issues;
}

function findEstimateIssues(row: AiDiaryRow, items: readonly ImportItemValues[]): string[] {
  const issues: string[] = [];
  const estimated = items.filter((_, index) => row.items[index]?.quantityEstimated);
  const nutritionEstimated = items.filter((_, index) => row.items[index]?.nutritionEstimated);

  if (row.nutritionSplitEstimated && items.length > 1) {
    issues.push(
      `The PDF gives one set of numbers for these ${items.length} items. They were split across the items by estimate: check each item.`
    );
  }
  if (estimated.length > 0) {
    issues.push(`The amount of ${listNames(estimated)} is estimated: the PDF gives a household measure, not a weight.`);
  }
  if (nutritionEstimated.length > 0) {
    issues.push(`Nutrition for ${listNames(nutritionEstimated)} was estimated by AI: verify before importing.`);
  }

  return issues;
}

/** Runs a complete row through the single-entry schema, so the preview flags exactly what saving would reject. */
function findSchemaIssues(values: ImportRowValues): string[] {
  const result = createFoodEntrySchema.shape.body.safeParse({
    mealType: values.mealType,
    date: values.date,
    name: values.name ?? undefined,
    items: values.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      macros: { proteinG: item.proteinG, carbG: item.carbG, fatG: item.fatG },
    })),
  });

  if (result.success) return [];

  return result.error.issues.map((issue) => {
    const itemIndex = issue.path[0] === 'items' ? issue.path[1] : undefined;
    return typeof itemIndex === 'number' ? `Item ${itemIndex + 1}: ${issue.message}` : issue.message;
  });
}

/** Shapes one model row into a reviewable preview row, collecting every reason it is not ready. */
export function toPreviewRow(row: AiDiaryRow, index: number): ImportPreviewRow {
  const values = toValues(row);
  const missingValueIssues = findMissingValueIssues(values);
  // Schema messages for blank fields would only repeat the friendlier ones above.
  const schemaIssues = missingValueIssues.length === 0 ? findSchemaIssues(values) : [];
  const issues = [
    row.uncertainReason,
    ...findEstimateIssues(row, values.items),
    ...missingValueIssues,
    ...schemaIssues,
  ].filter(
    (issue): issue is string => Boolean(issue)
  );

  return {
    rowNumber: index + 1,
    sourceText: row.sourceText,
    values,
    status: issues.length === 0 ? 'ready' : 'needs-review',
    issues: [...new Set(issues)],
  };
}
