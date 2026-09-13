import type { FoodItemInput, FoodItemUnit, Macros } from "@/types/nutrition";

type NamedItem = Pick<FoodItemInput, "name">;
type MeasuredItem = Pick<FoodItemInput, "quantity" | "unit">;
type NutritionItem = Pick<FoodItemInput, "calories" | "macros">;

export const ITEM_UNIT_LABELS: Record<FoodItemUnit, string> = {
  g: "g",
  ml: "ml",
  count: "count",
};

const roundToTenth = (value: number) => Math.round(value * 10) / 10;

/** "200 g", "250 ml" or "× 2": the amount as it reads next to an item's name. */
export function formatItemAmount({ quantity, unit }: MeasuredItem): string {
  return unit === "count" ? `× ${quantity}` : `${quantity} ${unit}`;
}

/** "Roti × 2" or "Paneer sabji 200 g". */
export function describeItem(item: NamedItem & MeasuredItem): string {
  return `${item.name} ${formatItemAmount(item)}`;
}

/** "Roti + Paneer sabji", the way an entry is named in lists, toasts and dialogs. */
export function itemsLabel(items: readonly NamedItem[]): string {
  return items.map((item) => item.name).join(" + ") || "Meal";
}

/** Calories and macros summed across items, for live totals while a form is being edited. */
export function sumItems(items: readonly NutritionItem[]): { calories: number; macros: Macros } {
  const totals = items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      proteinG: sum.proteinG + item.macros.proteinG,
      carbG: sum.carbG + item.macros.carbG,
      fatG: sum.fatG + item.macros.fatG,
    }),
    { calories: 0, proteinG: 0, carbG: 0, fatG: 0 }
  );

  return {
    calories: roundToTenth(totals.calories),
    macros: { proteinG: roundToTenth(totals.proteinG), carbG: roundToTenth(totals.carbG), fatG: roundToTenth(totals.fatG) },
  };
}
