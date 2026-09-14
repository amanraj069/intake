'use client';

import { useState } from 'react';
import AmountInput from '@/components/ui/AmountInput';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { ItemChanges, MicroRowChanges } from '@/hooks/useMealItems';
import { LIMITS } from '@/lib/validation/amount';
import {
  ITEM_AMOUNT_RULES,
  type FoodItemFormValues,
  type ItemAmountField,
  type ItemFormErrors,
} from '@/lib/validation/mealForm';
import { FOOD_ITEM_UNITS, type FoodItemUnit } from '@/types/nutrition';
import RemoveIconButton from '@/components/meals/import/RemoveIconButton';
import MicronutrientRows from './MicronutrientRows';

const UNIT_OPTIONS = FOOD_ITEM_UNITS.map((unit) => ({
  value: unit,
  label: unit === 'count' ? 'count (pieces)' : unit,
}));

const NUTRITION_FIELDS: readonly { field: ItemAmountField; unit: string }[] = [
  { field: 'calories', unit: 'kcal' },
  { field: 'proteinG', unit: 'g' },
  { field: 'carbG', unit: 'g' },
  { field: 'fatG', unit: 'g' },
];

const NAME_PLACEHOLDERS: Record<FoodItemUnit, string> = {
  g: 'Paneer sabji',
  ml: 'Milk',
  count: 'Roti',
};

interface FoodItemEditorProps {
  item: FoodItemFormValues;
  position: number;
  /** A single food is the whole entry, so it has no "Item 1" heading and cannot be removed. */
  variant: 'dish' | 'single';
  errors?: ItemFormErrors;
  disabled: boolean;
  onChange: (changes: ItemChanges) => void;
  onRemove: () => void;
  onAddMicroRow: (name?: string) => void;
  onUpdateMicroRow: (rowId: string, changes: MicroRowChanges) => void;
  onRemoveMicroRow: (rowId: string) => void;
}

/** One component of the meal: what it is, how much, and the nutrition of that amount. */
export default function FoodItemEditor({
  item,
  position,
  variant,
  errors,
  disabled,
  onChange,
  onRemove,
  onAddMicroRow,
  onUpdateMicroRow,
  onRemoveMicroRow,
}: FoodItemEditorProps) {
  const [showMicros, setShowMicros] = useState(item.microRows.length > 0);
  const microCount = item.microRows.filter((row) => row.name.trim()).length;
  const fieldId = (field: string) => `${item.id}-${field}`;

  return (
    <li className="space-y-4 sm:space-y-5 rounded-2xl border border-black/5 dark:border-white/10 bg-bg-card dark:bg-dark-bg-card p-3.5 sm:p-6 shadow-sm">
      {variant === 'dish' && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-text-primary dark:text-dark-text">
            Dish {position}
            {item.name.trim() && (
              <span className="font-light text-text-secondary dark:text-dark-text-secondary">
                : {item.name.trim()}
              </span>
            )}
          </p>
          <RemoveIconButton
            label={`Remove dish ${position}`}
            disabled={disabled}
            onClick={onRemove}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_10rem]">
        <div className="col-span-2 sm:col-span-1">
          <Input
            id={fieldId('name')}
            label={variant === 'single' ? 'Food name' : 'Dish name'}
            placeholder={NAME_PLACEHOLDERS[item.unit]}
            value={item.name}
            error={errors?.fields.name}
            disabled={disabled}
            required
            maxLength={LIMITS.itemNameLength}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>
        <AmountInput
          id={fieldId('quantity')}
          rule={ITEM_AMOUNT_RULES.quantity}
          value={item.quantity}
          error={errors?.fields.quantity}
          disabled={disabled}
          onChange={(quantity) => onChange({ quantity })}
        />
        <Select
          id={fieldId('unit')}
          label="Unit"
          options={UNIT_OPTIONS}
          value={item.unit}
          disabled={disabled}
          onChange={(event) => onChange({ unit: event.target.value as FoodItemUnit })}
        />
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        {NUTRITION_FIELDS.map(({ field, unit }) => (
          <AmountInput
            key={field}
            id={fieldId(field)}
            rule={ITEM_AMOUNT_RULES[field]}
            unit={unit}
            value={item[field]}
            error={errors?.fields[field]}
            disabled={disabled}
            onChange={(value) => onChange({ [field]: value })}
          />
        ))}
      </div>

      <div className="border-t border-black/5 dark:border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setShowMicros((open) => !open)}
          aria-expanded={showMicros}
          className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors cursor-pointer"
        >
          {showMicros
            ? 'Hide micronutrients'
            : microCount > 0
            ? `Micronutrients (${microCount})`
            : 'Add micronutrients: Optional (in mg)'}
        </button>

        {showMicros && (
          <div className="mt-4">
            <MicronutrientRows
              rows={item.microRows}
              errors={errors?.micros ?? {}}
              summaryError={errors?.microsSummary}
              disabled={disabled}
              onAddRow={() => onAddMicroRow()}
              onAddNutrientRow={(name) => onAddMicroRow(name)}
              onRemoveRow={onRemoveMicroRow}
              onUpdateRow={onUpdateMicroRow}
            />
          </div>
        )}
      </div>
    </li>
  );
}
