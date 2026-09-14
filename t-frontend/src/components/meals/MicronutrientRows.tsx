"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import {
  MICRONUTRIENT_OPTIONS,
  POPULAR_MICRONUTRIENTS,
  matchStandardNutrient,
} from "@/lib/micronutrients";
import { LIMITS } from "@/lib/validation/amount";
import type { MicronutrientRow } from "@/lib/validation/micronutrientRows";
import RemoveIconButton from "@/components/meals/import/RemoveIconButton";

const ADD_BUTTON_CLASSES = [
  "w-full sm:w-auto px-6 py-3 rounded-xl",
  "border border-dashed border-input-border dark:border-dark-input-border",
  "bg-bg-card dark:bg-dark-bg-card",
  "text-[10px] font-bold",
  "text-text-secondary dark:text-dark-text-secondary",
  "transition-colors duration-100 cursor-pointer",
  "hover:border-text-primary hover:text-text-primary",
  "dark:hover:border-dark-text dark:hover:text-dark-text",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

const SELECT_CLASSES = [
  "w-full appearance-none px-4 py-3 pr-10 text-sm rounded-xl",
  "bg-bg-card dark:bg-dark-bg-card border border-input-border dark:border-dark-input-border",
  "text-text-primary dark:text-dark-text",
  "transition-colors duration-150",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "dark:focus:border-accent-dark dark:focus:ring-accent-dark",
  "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
].join(" ");

interface SingleRowProps {
  row: MicronutrientRow;
  error?: string;
  disabled: boolean;
  onRemove: () => void;
  onChange: (changes: Partial<Omit<MicronutrientRow, "id">>) => void;
}

function MicronutrientRowFields({ row, error, disabled, onRemove, onChange }: SingleRowProps) {
  const matched = matchStandardNutrient(row.name);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => !matched && Boolean(row.name.trim()));

  const selectedValue = matched || (isCustomMode ? "custom" : "");

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextVal = e.target.value;
    if (nextVal === "custom") {
      setIsCustomMode(true);
      onChange({ name: "" });
    } else {
      setIsCustomMode(false);
      onChange({ name: nextVal });
    }
  }

  return (
    <div className="space-y-3 p-4 sm:p-5 rounded-2xl border border-input-border dark:border-dark-input-border bg-black/[0.015] dark:bg-[#11141D]/60">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
        {/* Nutrient Selector */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${row.id}-select`}
              className="block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary"
            >
              Nutrient
              <span className="text-red-500 ml-1 font-bold" aria-hidden="true">
                *
              </span>
            </label>
            <div className="sm:hidden -mr-1 -my-1">
              <RemoveIconButton
                label={`Remove ${row.name.trim() || "micronutrient"}`}
                disabled={disabled}
                onClick={onRemove}
                className="!h-8 !w-8"
              />
            </div>
          </div>

          <div className="relative">
            <select
              id={`${row.id}-select`}
              value={selectedValue}
              disabled={disabled}
              onChange={handleSelectChange}
              className={SELECT_CLASSES}
            >
              <option value="" disabled className="bg-bg-primary dark:bg-dark-bg text-text-secondary">
                Select a nutrient...
              </option>

              <optgroup label="Popular Tracked" className="bg-bg-primary dark:bg-dark-bg font-bold">
                {POPULAR_MICRONUTRIENTS.map((name) => (
                  <option key={`pop-${name}`} value={name} className="font-normal">
                    {name}
                  </option>
                ))}
              </optgroup>

              <optgroup label="Vitamins" className="bg-bg-primary dark:bg-dark-bg font-bold">
                {MICRONUTRIENT_OPTIONS.filter((o) => o.category === "Vitamins").map((o) => (
                  <option key={o.value} value={o.value} className="font-normal">
                    {o.label}
                  </option>
                ))}
              </optgroup>

              <optgroup label="Minerals & Electrolytes" className="bg-bg-primary dark:bg-dark-bg font-bold">
                {MICRONUTRIENT_OPTIONS.filter((o) => o.category === "Minerals").map((o) => (
                  <option key={o.value} value={o.value} className="font-normal">
                    {o.label}
                  </option>
                ))}
              </optgroup>

              <optgroup label="Other Compounds" className="bg-bg-primary dark:bg-dark-bg font-bold">
                {MICRONUTRIENT_OPTIONS.filter((o) => o.category === "Other").map((o) => (
                  <option key={o.value} value={o.value} className="font-normal">
                    {o.label}
                  </option>
                ))}
              </optgroup>

              <optgroup label="Custom" className="bg-bg-primary dark:bg-dark-bg font-bold">
                <option value="custom" className="font-normal">
                  Other / Custom nutrient...
                </option>
              </optgroup>
            </select>

            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-3 w-3 text-text-secondary dark:text-dark-text-secondary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="square"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Custom Name Input if "Custom" option is chosen */}
          {isCustomMode && (
            <div className="pt-1 animate-in fade-in duration-150">
              <Input
                id={`${row.id}-name`}
                label="Custom Nutrient Name"
                placeholder="e.g. Ashwagandha, L-Theanine..."
                value={row.name}
                disabled={disabled}
                required
                maxLength={LIMITS.nutrientNameLength}
                onChange={(event) => onChange({ name: event.target.value })}
              />
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="w-full sm:w-48">
          <Input
            id={`${row.id}-amount`}
            label="Amount (in mg)"
            type="number"
            inputMode="decimal"
            min={0}
            max={LIMITS.microAmount}
            step="any"
            placeholder="0"
            value={row.amount}
            disabled={disabled}
            required
            onChange={(event) => onChange({ amount: event.target.value, unit: "mg" })}
          />
        </div>

        {/* Remove Button (desktop) */}
        <RemoveIconButton
          label={`Remove ${row.name.trim() || "micronutrient"}`}
          disabled={disabled}
          onClick={onRemove}
          className="hidden sm:flex self-start sm:mt-[24px] !h-[46px] !w-[46px]"
        />
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
  onAddNutrientRow: (name: string) => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, changes: Partial<Omit<MicronutrientRow, "id">>) => void;
}

export default function MicronutrientRows({
  rows,
  errors,
  summaryError,
  disabled,
  onAddRow,
  onAddNutrientRow,
  onRemoveRow,
  onUpdateRow,
}: MicronutrientRowsProps) {
  const canAddRow = rows.length < LIMITS.micronutrientRows;

  return (
    <div className="space-y-6">
      {/* Quick Add Pills */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {POPULAR_MICRONUTRIENTS.map((name) => {
            const isAlreadyAdded = rows.some((r) => matchStandardNutrient(r.name) === name);
            return (
              <button
                key={name}
                type="button"
                disabled={disabled || isAlreadyAdded || !canAddRow}
                onClick={() => onAddNutrientRow(name)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-150 cursor-pointer ${
                  isAlreadyAdded
                    ? "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-text-secondary/40 dark:text-dark-text-secondary/40 cursor-default line-through opacity-60"
                    : "bg-bg-card dark:bg-dark-bg-card hover:bg-black/[0.06] dark:hover:bg-[#1E2436] hover:border-text-primary/30 dark:hover:border-white/20 border-input-border dark:border-dark-input-border text-text-primary dark:text-dark-text shadow-sm active:scale-[0.97]"
                }`}
              >
                + {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rows List */}
      <div className="space-y-4">
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

      {/* Manual Add Button */}
      <button
        type="button"
        onClick={onAddRow}
        disabled={disabled || !canAddRow}
        className={ADD_BUTTON_CLASSES}
      >
        {canAddRow ? "+ Add Another Micronutrient" : `Limit of ${LIMITS.micronutrientRows} reached`}
      </button>
    </div>
  );
}
