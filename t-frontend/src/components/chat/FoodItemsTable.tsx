"use client";

import type { FoodTableItem } from "@/lib/chatFoodItems";
import type { FoodItemUnit } from "@/types/nutrition";

interface FoodItemsTableProps {
  items: FoodTableItem[];
}

function formatQty(quantity: number, unit: FoodItemUnit): string {
  const rounded = Math.round(quantity * 10) / 10;
  if (unit === "count") return `${rounded}`;
  return `${rounded} ${unit}`;
}

/** The per-item calorie and macro breakdown, shared by the meal-log receipt and a nutrition estimate. */
export default function FoodItemsTable({ items }: FoodItemsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border dark:border-dark-border">
      <table className="w-full text-left text-[11px] sm:text-xs">
        <thead>
          <tr className="border-b border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
            <th className="px-2 py-1.5 sm:px-3 sm:py-2 font-semibold">Food Item</th>
            <th className="px-2 py-1.5 sm:px-3 sm:py-2 font-semibold text-center">Qty</th>
            <th className="px-2 py-1.5 sm:px-3 sm:py-2 font-semibold text-right">Calories</th>
            <th className="hidden sm:table-cell px-2 py-1.5 sm:px-3 sm:py-2 font-semibold text-right">Protein</th>
            <th className="hidden sm:table-cell px-2 py-1.5 sm:px-3 sm:py-2 font-semibold text-right">Carbs</th>
            <th className="hidden sm:table-cell px-2 py-1.5 sm:px-3 sm:py-2 font-semibold text-right">Fat</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={index}
              className="border-b border-border/60 dark:border-dark-border/50 last:border-b-0 text-text-primary dark:text-dark-text"
            >
              <td className="px-2 py-1.5 sm:px-3 sm:py-2 font-medium">{item.name}</td>
              <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-center text-text-secondary dark:text-dark-text-secondary tabular-nums">
                {formatQty(item.quantity, item.unit)}
              </td>
              <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-right tabular-nums">{Math.round(item.calories)}</td>
              <td className="hidden sm:table-cell px-2 py-1.5 sm:px-3 sm:py-2 text-right tabular-nums text-text-secondary dark:text-dark-text-secondary">
                {Math.round(item.proteinG * 10) / 10}g
              </td>
              <td className="hidden sm:table-cell px-2 py-1.5 sm:px-3 sm:py-2 text-right tabular-nums text-text-secondary dark:text-dark-text-secondary">
                {Math.round(item.carbG * 10) / 10}g
              </td>
              <td className="hidden sm:table-cell px-2 py-1.5 sm:px-3 sm:py-2 text-right tabular-nums text-text-secondary dark:text-dark-text-secondary">
                {Math.round(item.fatG * 10) / 10}g
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
