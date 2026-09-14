import type { FoodItemUnit } from "@/types/nutrition";

export interface FoodTableItem {
  name: string;
  quantity: number;
  unit: FoodItemUnit;
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** A `logMeal` or `estimateNutrition` action's items, however the server nested their macros. */
export function parseFoodItems(args: Record<string, unknown>): FoodTableItem[] {
  const rawItems = (args.items as Record<string, unknown>[]) ?? [];

  return rawItems.map((item) => {
    const macros = item.macros as Record<string, number> | undefined;
    return {
      name: (item.name as string) ?? "Unknown",
      quantity: (item.quantity as number) ?? 0,
      unit: (item.unit as FoodItemUnit) ?? "g",
      calories: (item.calories as number) ?? 0,
      proteinG: macros?.proteinG ?? (item.proteinG as number) ?? 0,
      carbG: macros?.carbG ?? (item.carbG as number) ?? 0,
      fatG: macros?.fatG ?? (item.fatG as number) ?? 0,
    };
  });
}

/** A card can only be drawn as a receipt when its items came back with it; older replies stored none. */
export function hasFoodItems(args: Record<string, unknown>): boolean {
  return Array.isArray(args.items) && args.items.length > 0;
}
