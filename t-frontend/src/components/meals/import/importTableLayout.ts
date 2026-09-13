import type { ImportItemAmountField, ImportItemField } from "@/lib/validation/importRow";

/**
 * One grid definition shared by a meal's column header, its dish lines and its
 * totals line, so columns cannot drift apart. Below `lg` a dish is a labelled
 * card; from `lg` it is a table row. The dish column gets only a modest share
 * more than a number column, so the numbers stay the focus.
 */
export const IMPORT_ITEM_GRID =
  "grid grid-cols-2 sm:grid-cols-4 gap-3 lg:grid-cols-[minmax(12rem,3fr)_minmax(4.5rem,1fr)_minmax(5rem,1fr)_minmax(4.5rem,1fr)_repeat(3,minmax(4rem,0.8fr))_2.25rem] lg:gap-2 lg:items-center";

export type ImportColumnKind = "text" | "unit" | "amount";

export interface ImportColumn {
  field: ImportItemField;
  label: string;
  /** Shown lighter beside the label, e.g. "kcal". */
  unitLabel?: string;
  kind: ImportColumnKind;
  /** Card-layout span; every column is a single cell in the table layout. */
  cardSpan?: string;
  /** Nutrient columns carry their semantic colour in the header and totals. */
  accent?: string;
}

export const IMPORT_ITEM_COLUMNS: readonly ImportColumn[] = [
  { field: "name", label: "Dish", kind: "text", cardSpan: "col-span-2 lg:col-span-1" },
  { field: "quantity", label: "Amount", kind: "amount" },
  { field: "unit", label: "Unit", kind: "unit" },
  { field: "calories", label: "Energy", unitLabel: "kcal", kind: "amount", accent: "text-calories dark:text-dark-calories" },
  { field: "proteinG", label: "Protein", unitLabel: "g", kind: "amount", accent: "text-protein dark:text-dark-protein" },
  { field: "carbG", label: "Carbs", unitLabel: "g", kind: "amount", accent: "text-carbs dark:text-dark-carbs" },
  { field: "fatG", label: "Fat", unitLabel: "g", kind: "amount", accent: "text-fat dark:text-dark-fat" },
];

export type ImportNutrientField = Exclude<ImportItemAmountField, "quantity">;

export const IMPORT_NUTRIENT_COLUMNS = IMPORT_ITEM_COLUMNS.filter(
  (column): column is ImportColumn & { field: ImportNutrientField } =>
    column.kind === "amount" && column.field !== "quantity"
);
