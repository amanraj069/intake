"use client";

import { useState } from "react";
import FormSection from "@/components/ui/FormSection";
import Input from "@/components/ui/Input";
import OptionPills, { type PillOption } from "@/components/ui/OptionPills";
import type { UseMealItemsResult } from "@/hooks/useMealItems";
import { itemsLabel } from "@/lib/foodItems";
import { LIMITS } from "@/lib/validation/amount";
import { typedItemNutrition, type EntryMode, type MealFormErrors } from "@/lib/validation/mealForm";
import FoodItemEditor from "./FoodItemEditor";
import MealTotals from "./MealTotals";

const MODE_OPTIONS: readonly PillOption<EntryMode>[] = [
  { value: "single", label: "Single food" },
  { value: "multiple", label: "Meal with dishes" },
];

const MODE_DESCRIPTIONS: Record<EntryMode, string> = {
  single: "One food with its amount. Count pieces like eggs, weigh everything else in g, or ml for drinks.",
  multiple: "Name the meal, then add each dish with its own amount, such as 2 rotis and 200 g of sabji.",
};

const ADD_DISH_BUTTON_CLASSES =
  "w-full rounded-2xl border border-dashed border-input-border dark:border-dark-input-border px-6 py-4 text-sm font-semibold text-text-secondary dark:text-dark-text-secondary transition-colors duration-150 cursor-pointer hover:border-text-primary hover:text-text-primary dark:hover:border-dark-text dark:hover:text-dark-text disabled:opacity-50 disabled:cursor-not-allowed";

interface MealItemsSectionProps {
  mode: EntryMode;
  mealName: string;
  mealItems: UseMealItemsResult;
  errors: MealFormErrors;
  disabled: boolean;
  onModeChange: (mode: EntryMode) => void;
  onMealNameChange: (name: string) => void;
}

/** What was eaten: one food, or a named meal made of dishes that each carry their own nutrition. */
export default function MealItemsSection({
  mode,
  mealName,
  mealItems,
  errors,
  disabled,
  onModeChange,
  onMealNameChange,
}: MealItemsSectionProps) {
  const [modeHint, setModeHint] = useState<string | null>(null);
  const { items } = mealItems;
  const namedItems = items.filter((item) => item.name.trim()).map((item) => ({ name: item.name.trim() }));

  function changeMode(next: EntryMode) {
    // Switching to a single food would silently drop dishes, so the user removes them first.
    if (next === "single" && items.length > 1) {
      setModeHint("Remove dishes until one is left to log it as a single food.");
      return;
    }
    setModeHint(null);
    onModeChange(next);
  }

  return (
    <FormSection
      title="What you ate"
      description={MODE_DESCRIPTIONS[mode]}
      action={
        <OptionPills
          label="Single food or meal with dishes"
          options={MODE_OPTIONS}
          value={mode}
          disabled={disabled}
          size="md"
          className="w-full sm:w-auto"
          onChange={changeMode}
        />
      }
    >
      {modeHint && <p className="text-xs text-error dark:text-error-dark">{modeHint}</p>}

      {mode === "multiple" && (
        <Input
          id="meal-name"
          label="Meal name (optional)"
          placeholder={namedItems.length > 1 ? itemsLabel(namedItems) : "Roti sabji"}
          value={mealName}
          error={errors.fields.name}
          disabled={disabled}
          maxLength={LIMITS.itemNameLength}
          onChange={(event) => onMealNameChange(event.target.value)}
        />
      )}

      <ul className="space-y-4">
        {items.map((item, index) => (
          <FoodItemEditor
            key={item.id}
            item={item}
            position={index + 1}
            variant={mode === "single" ? "single" : "dish"}
            errors={errors.items[item.id]}
            disabled={disabled}
            onChange={(changes) => mealItems.updateItem(item.id, changes)}
            onRemove={() => mealItems.removeItem(item.id)}
            onAddMicroRow={(name) => mealItems.addMicroRow(item.id, name)}
            onUpdateMicroRow={(rowId, changes) => mealItems.updateMicroRow(item.id, rowId, changes)}
            onRemoveMicroRow={(rowId) => mealItems.removeMicroRow(item.id, rowId)}
          />
        ))}
      </ul>

      {errors.fields.items && <p className="text-xs text-error dark:text-error-dark">{errors.fields.items}</p>}

      {mode === "multiple" && (
        <>
          <button
            type="button"
            onClick={mealItems.addItem}
            disabled={disabled || items.length >= LIMITS.itemsPerEntry}
            className={ADD_DISH_BUTTON_CLASSES}
          >
            + Add another dish
          </button>
          <MealTotals items={typedItemNutrition(items)} live />
        </>
      )}
    </FormSection>
  );
}
