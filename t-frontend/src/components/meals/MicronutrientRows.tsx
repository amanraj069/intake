"use client";

import Input from "@/components/ui/Input";
import { LIMITS } from "@/lib/validation/amount";
import type { MicronutrientRow } from "@/lib/validation/mealForm";

const REMOVE_BUTTON_CLASSES = [
  "h-[46px] px-5 shrink-0 border border-input-border dark:border-dark-input-border",
  "text-[10px] font-bold uppercase tracking-[0.2em]",
  "text-text-secondary dark:text-dark-text-secondary",
  "transition-colors duration-100 cursor-pointer",
  "hover:bg-text-primary hover:text-bg-primary hover:border-text-primary",
  "dark:hover:bg-dark-text dark:hover:text-dark-bg dark:hover:border-dark-text",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

const ADD_BUTTON_CLASSES = [
  "w-full sm:w-auto px-6 py-3",
  "border border-dashed border-input-border dark:border-dark-input-border",
  "text-[10px] font-bold uppercase tracking-[0.2em]",
  "text-text-secondary dark:text-dark-text-secondary",
  "transition-colors duration-100 cursor-pointer",
  "hover:border-text-primary hover:text-text-primary",
  "dark:hover:border-dark-text dark:hover:text-dark-text",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

interface SingleRowProps {
  row: MicronutrientRow;
  error?: string;
  disabled: boolean;
  onRemove: () => void;
  onChange: (changes: Partial<Omit<MicronutrientRow, "id">>) => void;
}

function MicronutrientRowFields({ row, error, disabled, onRemove, onChange }: SingleRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
        <div className="flex-1">
          <Input
            id={`${row.id}-name`}
            label="Nutrient"
            placeholder="vitaminC"
            value={row.name}
            disabled={disabled}
            maxLength={LIMITS.nutrientNameLength}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>

        <div className="w-full sm:w-40">
          <Input
            id={`${row.id}-amount`}
            label="Amount"
            type="number"
            inputMode="decimal"
            min={0}
            max={LIMITS.microAmount}
            step="any"
            placeholder="0"
            value={row.amount}
            disabled={disabled}
            onChange={(event) => onChange({ amount: event.target.value })}
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${row.name.trim() || "micronutrient"}`}
          className={`${REMOVE_BUTTON_CLASSES} self-start sm:mt-[26px]`}
        >
          Remove
        </button>
      </div>

      {error && <p className="text-xs text-error dark:text-error-dark">{error}</p>}
    </div>
  );
}

interface MicronutrientRowsProps {
  rows: MicronutrientRow[];
  /** Keyed by row id, so each pair shows its own message. */
  errors: Record<string, string>;
  summaryError?: string;
  disabled: boolean;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, changes: Partial<Omit<MicronutrientRow, "id">>) => void;
}

/** Free-form nutrient name-amount pairs: the tracked set differs per food. */
export default function MicronutrientRows({
  rows,
  errors,
  summaryError,
  disabled,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
}: MicronutrientRowsProps) {
  const canAddRow = rows.length < LIMITS.micronutrientRows;

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {rows.map((row) => (
          <MicronutrientRowFields
            key={row.id}
            row={row}
            error={errors[row.id]}
            disabled={disabled}
            onRemove={() => onRemoveRow(row.id)}
            onChange={(changes) => onUpdateRow(row.id, changes)}
          />
        ))}
      </div>

      {summaryError && <p className="text-xs text-error dark:text-error-dark">{summaryError}</p>}

      <button
        type="button"
        onClick={onAddRow}
        disabled={disabled || !canAddRow}
        className={ADD_BUTTON_CLASSES}
      >
        {canAddRow ? "+ Add Micronutrient" : `Limit of ${LIMITS.micronutrientRows} reached`}
      </button>
    </div>
  );
}
