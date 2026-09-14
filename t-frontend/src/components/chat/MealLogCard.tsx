"use client";

import Link from "next/link";
import { CheckIcon, CoffeeIcon, BowlIcon, AppleIcon, LogMealIcon } from "@/components/icons";
import { useDailyIntake } from "@/hooks/useDailyIntake";
import type { PendingChatAction } from "@/types/chat";
import type { FoodItemUnit } from "@/types/nutrition";
import DailyProgressStrip from "./DailyProgressStrip";
import MacroRing from "./MacroRing";

interface MealLogCardProps {
  action: PendingChatAction;
  /** Called when "Log Another Meal" is clicked — focuses the composer. */
  onLogAnother?: () => void;
}

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface ParsedItem {
  name: string;
  quantity: number;
  unit: FoodItemUnit;
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

const MEAL_ICONS: Record<MealType, typeof CoffeeIcon> = {
  breakfast: CoffeeIcon,
  lunch: BowlIcon,
  dinner: LogMealIcon,
  snack: AppleIcon,
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function parseMealData(action: PendingChatAction) {
  const args = action.args as Record<string, unknown>;
  const mealType = (args.mealType as MealType) ?? "snack";
  const rawItems = (args.items as Record<string, unknown>[]) ?? [];

  const items: ParsedItem[] = rawItems.map((item) => {
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

  const totalCalories = items.reduce((s, i) => s + i.calories, 0);
  const totalProtein = items.reduce((s, i) => s + i.proteinG, 0);
  const totalCarbs = items.reduce((s, i) => s + i.carbG, 0);
  const totalFat = items.reduce((s, i) => s + i.fatG, 0);
  const totalMacroG = totalProtein + totalCarbs + totalFat;

  return {
    mealType,
    items,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    proteinPct: totalMacroG > 0 ? (totalProtein / totalMacroG) * 100 : 0,
    carbsPct: totalMacroG > 0 ? (totalCarbs / totalMacroG) * 100 : 0,
    fatPct: totalMacroG > 0 ? (totalFat / totalMacroG) * 100 : 0,
  };
}

function formatQty(quantity: number, unit: FoodItemUnit): string {
  const rounded = Math.round(quantity * 10) / 10;
  if (unit === "count") return `${rounded}`;
  return `${rounded} ${unit}`;
}

/**
 * Structured meal log receipt card, shown after a logMeal action is confirmed.
 * Displays meal type, macro rings, food table, daily progress, and action buttons.
 */
export default function MealLogCard({ action, onLogAnother }: MealLogCardProps) {
  const meal = parseMealData(action);
  const MealIcon = MEAL_ICONS[meal.mealType] ?? LogMealIcon;
  const mealLabel = MEAL_LABELS[meal.mealType] ?? "Meal";
  const { summary, loading: dailyLoading } = useDailyIntake();

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 rounded-2xl border border-dark-border bg-dark-bg-card p-3.5 sm:p-5">
      {/* ── Header: meal type + total calories ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dark-muted">
            <MealIcon className="h-4 w-4 text-accent-dark" />
          </span>
          <span className="text-base font-bold text-dark-text">{mealLabel}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium text-dark-text-secondary">Total Calories</p>
          <p className="text-lg font-extrabold text-dark-text tabular-nums">
            {Math.round(meal.totalCalories)}{" "}
            <span className="text-xs font-normal text-dark-text-secondary">kcal</span>
          </p>
        </div>
      </div>

      {/* ── Macro rings ── */}
      <div className="flex items-stretch justify-center gap-2 sm:gap-3">
        <MacroRing
          label="Protein"
          value={meal.totalProtein}
          percent={meal.proteinPct}
          color="var(--color-dark-protein)"
          bgColor="var(--color-dark-protein-bg)"
        />
        <MacroRing
          label="Carbs"
          value={meal.totalCarbs}
          percent={meal.carbsPct}
          color="var(--color-dark-carbs)"
          bgColor="var(--color-dark-carbs-bg)"
        />
        <MacroRing
          label="Fat"
          value={meal.totalFat}
          percent={meal.fatPct}
          color="var(--color-dark-fat)"
          bgColor="var(--color-dark-fat-bg)"
        />
      </div>

      {/* ── Today's progress strip ── */}
      <DailyProgressStrip summary={summary} loading={dailyLoading} />

      {/* ── Food items table ── */}
      <div className="overflow-x-auto rounded-lg border border-dark-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-dark-border text-dark-text-secondary">
              <th className="px-3 py-2 font-semibold">Food Item</th>
              <th className="px-3 py-2 font-semibold text-center">Qty</th>
              <th className="px-3 py-2 font-semibold text-right">Calories</th>
              <th className="hidden sm:table-cell px-3 py-2 font-semibold text-right">Protein</th>
              <th className="hidden sm:table-cell px-3 py-2 font-semibold text-right">Carbs</th>
              <th className="hidden sm:table-cell px-3 py-2 font-semibold text-right">Fat</th>
            </tr>
          </thead>
          <tbody>
            {meal.items.map((item, index) => (
              <tr
                key={index}
                className="border-b border-dark-border/50 last:border-b-0 text-dark-text"
              >
                <td className="px-3 py-2 font-medium">{item.name}</td>
                <td className="px-3 py-2 text-center text-dark-text-secondary tabular-nums">
                  {formatQty(item.quantity, item.unit)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{Math.round(item.calories)}</td>
                <td className="hidden sm:table-cell px-3 py-2 text-right tabular-nums text-dark-text-secondary">
                  {Math.round(item.proteinG * 10) / 10}g
                </td>
                <td className="hidden sm:table-cell px-3 py-2 text-right tabular-nums text-dark-text-secondary">
                  {Math.round(item.carbG * 10) / 10}g
                </td>
                <td className="hidden sm:table-cell px-3 py-2 text-right tabular-nums text-dark-text-secondary">
                  {Math.round(item.fatG * 10) / 10}g
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Success confirmation ── */}
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-dark-muted">
          <CheckIcon className="h-3 w-3 text-accent-dark" />
        </span>
        <span className="text-sm font-bold text-accent-dark">Meal logged successfully!</span>
      </div>

      {/* ── Action buttons ── */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-accent-dark-muted px-4 py-2 text-xs font-semibold text-white transition-all duration-150 hover:bg-accent-dark-muted-hover active:scale-[0.98]"
        >
          View Daily Progress
        </Link>
        {onLogAnother && (
          <button
            type="button"
            onClick={onLogAnother}
            className="inline-flex items-center justify-center rounded-xl border border-dark-border bg-dark-bg-card px-4 py-2 text-xs font-semibold text-dark-text transition-all duration-150 hover:bg-dark-surface active:scale-[0.98] cursor-pointer"
          >
            Log Another Meal
          </button>
        )}
      </div>
    </div>
  );
}
