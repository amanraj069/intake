import { MEAL_TYPES, type FoodItemUnit, type MealType } from "@/types/nutrition";
import type { FoodItemFormValues, MealDetails } from "./validation/mealForm";
import type { MicronutrientRow } from "./validation/micronutrientRows";
import { nextFormRowId } from "./validation/micronutrientRows";

type JsonObject = Record<string, unknown>;

/** Unit spellings people and LLMs actually write, mapped onto the three the app stores. */
const UNIT_ALIASES: Record<string, FoodItemUnit> = {
  g: "g",
  gram: "g",
  grams: "g",
  ml: "ml",
  millilitre: "ml",
  milliliter: "ml",
  count: "count",
  piece: "count",
  pieces: "count",
  pc: "count",
  pcs: "count",
  number: "count",
};

/** Numbers stay numbers in the template, and blanks stay blank strings so the user can see what to fill. */
function toJsonNumber(raw: string): number | string {
  const value = Number(raw.trim());
  return raw.trim() !== "" && Number.isFinite(value) ? value : "";
}

function microRowsToJson(rows: readonly MicronutrientRow[]): Record<string, { amount: number | string; unit: string }> {
  return Object.fromEntries(
    rows
      .filter((row) => row.name.trim())
      .map((row) => [row.name.trim(), { amount: toJsonNumber(row.amount), unit: row.unit || "mg" }])
  );
}

function itemToJson(item: FoodItemFormValues) {
  return {
    name: item.name,
    quantity: toJsonNumber(item.quantity),
    unit: item.unit,
    calories: toJsonNumber(item.calories),
    proteinG: toJsonNumber(item.proteinG),
    carbG: toJsonNumber(item.carbG),
    fatG: toJsonNumber(item.fatG),
    micros: microRowsToJson(item.microRows),
  };
}

/** The editable JSON for the form's current state, with comments explaining each part. */
export function generateMealJson(details: MealDetails, items: readonly FoodItemFormValues[]): string {
  const itemsJson = JSON.stringify(items.map(itemToJson), null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join("\n");

  return `{
  // Step 1: Meal
  "mealType": "${details.mealType}", // one of: breakfast, lunch, snack, dinner
  "date": "${details.date}", // YYYY-MM-DD
  "name": ${JSON.stringify(details.name)}, // what the whole meal is called, e.g. "Roti sabji"; blank uses the item names

  // Step 2: Items, one per separate food. "2 rotis + 200 g paneer sabji" is two items.
  // unit is "g" for weighed food, "ml" for liquids, or "count" for pieces (rotis, eggs, slices).
  // calories (kcal) and proteinG, carbG, fatG (grams) are for that item's quantity, not the whole meal.
  // micros is optional, amounts in mg: { "Iron": { "amount": 2, "unit": "mg" } }
  "items": ${itemsJson}
}`;
}

/** Accepts JSON with `//` comments, trailing commas and a markdown code fence, as LLMs tend to return it. */
export function stripJsonComments(jsonWithComments: string): string {
  let text = jsonWithComments.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  // Removes `// ...` comments while leaving `//` inside quoted strings alone.
  const withoutComments = text.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*$)/gm, (match, comment) => (comment ? "" : match));
  return withoutComments.replace(/,(\s*[}\]])/g, "$1");
}

export function parseMealJson(text: string): { data?: JsonObject; error?: string } {
  try {
    const parsed = JSON.parse(stripJsonComments(text)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "JSON must be a root object { ... }" };
    }
    return { data: parsed as JsonObject };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Invalid JSON syntax" };
  }
}

const readText = (value: unknown) => (value === undefined || value === null ? "" : String(value).trim());

function readMicroRows(micros: unknown): MicronutrientRow[] {
  if (!micros || typeof micros !== "object") return [];

  const entries = Array.isArray(micros)
    ? micros.map((entry) => [readText((entry as JsonObject)?.name), entry] as const)
    : Object.entries(micros as JsonObject);

  return entries
    .map(([name, value]) => {
      const detail: JsonObject = value && typeof value === "object" ? (value as JsonObject) : { amount: value };
      return { id: nextFormRowId("micronutrient"), name: name.trim(), amount: readText(detail.amount), unit: readText(detail.unit) || "mg" };
    })
    .filter((row) => row.name && row.amount);
}

/** Reads one item leniently: `protein` for `proteinG`, a nested `macros` object, or `foodName` for `name` all work. */
function readItem(raw: JsonObject): FoodItemFormValues {
  const macros = (raw.macros && typeof raw.macros === "object" ? raw.macros : {}) as JsonObject;
  const pick = (...values: unknown[]) => readText(values.find((value) => value !== undefined && value !== null));

  return {
    id: nextFormRowId("item"),
    name: pick(raw.name, raw.foodName),
    quantity: pick(raw.quantity, raw.amount),
    unit: UNIT_ALIASES[readText(raw.unit).toLowerCase()] ?? "g",
    calories: pick(raw.calories, raw.kcal),
    proteinG: pick(raw.proteinG, raw.protein, macros.proteinG),
    carbG: pick(raw.carbG, raw.carbs, macros.carbG),
    fatG: pick(raw.fatG, raw.fat, macros.fatG),
    microRows: readMicroRows(raw.micros),
  };
}

/**
 * The form state described by parsed JSON. Fields the JSON leaves out keep their
 * current values. A single food at the top level, the pre-items shape, is read
 * as one item so older copied prompts still work.
 */
export function mealJsonToFormState(
  data: JsonObject,
  current: MealDetails
): { details: MealDetails; items: FoodItemFormValues[] | null } {
  const mealType = readText(data.mealType).toLowerCase();
  const details: MealDetails = {
    mealType: MEAL_TYPES.includes(mealType as MealType) ? (mealType as MealType) : current.mealType,
    date: data.date !== undefined ? readText(data.date) : current.date,
    name: data.name !== undefined && Array.isArray(data.items) ? readText(data.name) : current.name,
  };

  if (Array.isArray(data.items)) {
    return { details, items: data.items.filter((item) => item && typeof item === "object").map((item) => readItem(item as JsonObject)) };
  }

  // Without `items`, a top-level `name` is the single food's name rather than the meal's.
  return { details, items: data.foodName !== undefined || data.name !== undefined ? [readItem(data)] : null };
}
