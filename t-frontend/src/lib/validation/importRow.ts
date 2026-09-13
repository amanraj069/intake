import type { ImportItemValues, ImportPreviewRow } from "@/types/foodImport";
import type { FoodEntryInput, FoodItemInput, FoodItemUnit, MealType } from "@/types/nutrition";
import { LIMITS, collectAmountErrors, hasErrors, toAmount, type AmountRule, type FieldErrors } from "./amount";
import { nextFormRowId } from "./micronutrientRows";

const CALENDAR_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** One food on an import row as the review table edits it: every number is the raw text of its field. */
export interface ImportItemDraft {
  id: string;
  name: string;
  quantity: string;
  unit: FoodItemUnit;
  calories: string;
  proteinG: string;
  carbG: string;
  fatG: string;
}

/** One diary line under review. */
export interface ImportRowDraft {
  id: string;
  rowNumber: number;
  /** What the server flagged when it read the PDF. */
  issues: string[];
  /** A flagged row stays blocked until the user edits it or marks it as checked. */
  reviewed: boolean;
  date: string;
  mealType: MealType | "";
  /** Blank means "call it by its items". */
  name: string;
  items: ImportItemDraft[];
}

export type ImportItemAmountField = "quantity" | "calories" | "proteinG" | "carbG" | "fatG";
export type ImportItemField = ImportItemAmountField | "name" | "unit";
export type ImportRowField = "date" | "mealType" | "name";

export const IMPORT_ITEM_AMOUNT_RULES: Record<ImportItemAmountField, AmountRule<ImportItemAmountField>> = {
  quantity: { field: "quantity", label: "Quantity", max: LIMITS.quantity, required: true },
  calories: { field: "calories", label: "Calories", max: LIMITS.calories, required: true },
  proteinG: { field: "proteinG", label: "Protein", max: LIMITS.macroGrams, required: true },
  carbG: { field: "carbG", label: "Carbs", max: LIMITS.macroGrams, required: true },
  fatG: { field: "fatG", label: "Fat", max: LIMITS.macroGrams, required: true },
};

const toText = (value: string | number | null) => (value === null ? "" : String(value));

export function createEmptyImportItem(): ImportItemDraft {
  return { id: nextFormRowId("import-item"), name: "", quantity: "", unit: "g", calories: "", proteinG: "", carbG: "", fatG: "" };
}

function itemValuesToDraft(item: ImportItemValues): ImportItemDraft {
  return {
    id: nextFormRowId("import-item"),
    name: toText(item.name),
    quantity: toText(item.quantity),
    unit: item.unit,
    calories: toText(item.calories),
    proteinG: toText(item.proteinG),
    carbG: toText(item.carbG),
    fatG: toText(item.fatG),
  };
}

export function previewRowToDraft(row: ImportPreviewRow): ImportRowDraft {
  return {
    id: `row-${row.rowNumber}`,
    rowNumber: row.rowNumber,
    issues: row.issues,
    reviewed: row.issues.length === 0,
    date: toText(row.values.date),
    mealType: row.values.mealType ?? "",
    name: toText(row.values.name),
    items: row.values.items.map(itemValuesToDraft),
  };
}

export interface ImportRowValidation {
  rowErrors: FieldErrors<ImportRowField | "items">;
  /** Keyed by item id, present only for items with a problem. */
  itemErrors: Record<string, FieldErrors<ImportItemField>>;
  /** How many fields need fixing across the row and its items. */
  errorCount: number;
  /** Present only when every field is valid. */
  payload?: FoodEntryInput;
}

function findRowErrors(draft: ImportRowDraft): FieldErrors<ImportRowField | "items"> {
  const errors: FieldErrors<ImportRowField | "items"> = {};

  if (!CALENDAR_DAY_PATTERN.test(draft.date) || Number.isNaN(Date.parse(draft.date))) errors.date = "Choose a date";
  if (!draft.mealType) errors.mealType = "Choose a meal";
  if (draft.name.trim().length > LIMITS.itemNameLength) errors.name = "Meal name is too long";
  if (draft.items.length === 0) errors.items = "Add at least one item";
  else if (draft.items.length > LIMITS.itemsPerEntry) errors.items = `At most ${LIMITS.itemsPerEntry} items`;

  return errors;
}

function validateItem(item: ImportItemDraft): { errors: FieldErrors<ImportItemField>; payload?: FoodItemInput } {
  const errors: FieldErrors<ImportItemField> = collectAmountErrors(Object.values(IMPORT_ITEM_AMOUNT_RULES), item);
  const name = item.name.trim();

  if (!name) errors.name = "Item name is required";
  else if (name.length > LIMITS.itemNameLength) errors.name = "Item name is too long";
  if (hasErrors(errors)) return { errors };

  return {
    errors,
    payload: {
      name,
      quantity: toAmount(item.quantity),
      unit: item.unit,
      calories: toAmount(item.calories),
      macros: { proteinG: toAmount(item.proteinG), carbG: toAmount(item.carbG), fatG: toAmount(item.fatG) },
    },
  };
}

/** Checks a row and its items against the same limits as a single entry, and builds the entry it would save. */
export function validateImportRow(draft: ImportRowDraft): ImportRowValidation {
  const rowErrors = findRowErrors(draft);
  const itemErrors: Record<string, FieldErrors<ImportItemField>> = {};
  const items: FoodItemInput[] = [];

  for (const item of draft.items) {
    const result = validateItem(item);
    if (result.payload) items.push(result.payload);
    else itemErrors[item.id] = result.errors;
  }

  const errorCount =
    Object.keys(rowErrors).length + Object.values(itemErrors).reduce((sum, errors) => sum + Object.keys(errors).length, 0);
  if (errorCount > 0 || !draft.mealType) return { rowErrors, itemErrors, errorCount };

  return {
    rowErrors,
    itemErrors,
    errorCount,
    payload: {
      mealType: draft.mealType,
      date: draft.date,
      name: draft.name.trim() || undefined,
      items,
      source: "pdf-import",
    },
  };
}
