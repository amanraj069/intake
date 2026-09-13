import type { Micronutrients } from "@/types/nutrition";
import { LIMITS, findAmountError, toAmount } from "./amount";

export interface MicronutrientRow {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

export interface MicronutrientRowsValidation {
  /** Keyed by row id so each row can show its own message. */
  errors: Record<string, string>;
  /** A problem with the list as a whole, not with one row. */
  summary?: string;
  micros: Micronutrients;
}

// A module counter rather than a random id: the same sequence runs on the server
// and on the client, so the first render hydrates without a mismatch.
let nextRowNumber = 0;

/** A form-local id for an editable row, unique for the life of the page. */
export function nextFormRowId(prefix: string): string {
  nextRowNumber += 1;
  return `${prefix}-${nextRowNumber}`;
}

export function createEmptyMicroRow(): MicronutrientRow {
  return { id: nextFormRowId("micronutrient"), name: "", amount: "", unit: "mg" };
}

/** Saved nutrients as editable rows. An empty map gives no rows: nutrients are opt-in per item. */
export function microsToRows(micros?: Micronutrients): MicronutrientRow[] {
  return Object.entries(micros ?? {}).map(([name, value]) => ({
    id: nextFormRowId("micronutrient"),
    name,
    amount: String(value.amount),
    unit: value.unit || "mg",
  }));
}

/** A row left completely blank is treated as "not filled in yet", not as an error. */
function isBlankRow(row: MicronutrientRow): boolean {
  return !row.name.trim() && !row.amount.trim();
}

function findRowError(row: MicronutrientRow, seenNames: Set<string>): string | undefined {
  const name = row.name.trim();

  if (!name) return "Nutrient name is required";
  if (name.length > LIMITS.nutrientNameLength) return "Nutrient name is too long";
  if (seenNames.has(name.toLowerCase())) return "Duplicate nutrient name";

  return findAmountError(row.amount, { label: "Amount (in mg)", max: LIMITS.microAmount, required: true });
}

export function validateMicronutrientRows(rows: readonly MicronutrientRow[]): MicronutrientRowsValidation {
  const errors: Record<string, string> = {};
  const micros: Micronutrients = {};
  const seenNames = new Set<string>();

  for (const row of rows) {
    if (isBlankRow(row)) continue;

    const error = findRowError(row, seenNames);
    if (error) {
      errors[row.id] = error;
      continue;
    }

    const name = row.name.trim();
    seenNames.add(name.toLowerCase());
    micros[name] = { amount: toAmount(row.amount), unit: row.unit || "mg" };
  }

  const filledCount = rows.filter((row) => !isBlankRow(row)).length;
  const summary =
    filledCount > LIMITS.micronutrientRows ? `At most ${LIMITS.micronutrientRows} micronutrients are allowed` : undefined;

  return { errors, summary, micros };
}
