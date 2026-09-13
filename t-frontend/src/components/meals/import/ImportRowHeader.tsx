"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { ImportRowActions, ReviewedImportRow } from "@/hooks/useImportRows";
import { LIMITS } from "@/lib/validation/amount";
import { MEAL_TYPES } from "@/types/nutrition";
import RemoveIconButton from "./RemoveIconButton";

const MEAL_OPTIONS = [
  { value: "", label: "Choose" },
  ...MEAL_TYPES.map((mealType) => ({ value: mealType, label: mealType.charAt(0).toUpperCase() + mealType.slice(1) })),
];

const ERROR_BORDER = "border-error dark:border-error-dark";

interface ImportRowHeaderProps {
  row: ReviewedImportRow;
  disabled: boolean;
  actions: ImportRowActions;
}

/** A meal's own line: row number, name, date, meal and the remove control. */
export default function ImportRowHeader({ row, disabled, actions }: ImportRowHeaderProps) {
  const { draft, validation } = row;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <p className="w-full sm:w-auto sm:pb-2.5 text-xs font-bold text-text-secondary dark:text-dark-text-secondary tabular-nums">
        Row {draft.rowNumber}
      </p>
      <div className="w-full sm:flex-1 sm:min-w-[12rem]">
        <Input
          id={`${draft.id}-name`}
          label="Meal name"
          density="compact"
          placeholder={draft.items.map((item) => item.name.trim()).filter(Boolean).join(" + ") || "Meal name"}
          value={draft.name}
          disabled={disabled}
          maxLength={LIMITS.itemNameLength}
          className={validation.rowErrors.name ? ERROR_BORDER : ""}
          onChange={(event) => actions.updateRowField(draft.id, "name", event.target.value)}
        />
      </div>
      <div className="flex-1 sm:flex-none sm:w-40">
        <Input
          id={`${draft.id}-date`}
          label="Date"
          type="date"
          density="compact"
          value={draft.date}
          disabled={disabled}
          className={validation.rowErrors.date ? ERROR_BORDER : ""}
          onChange={(event) => actions.updateRowField(draft.id, "date", event.target.value)}
        />
      </div>
      <div className="flex-1 sm:flex-none sm:w-36">
        <Select
          id={`${draft.id}-meal`}
          label="Meal"
          density="compact"
          options={MEAL_OPTIONS}
          value={draft.mealType}
          disabled={disabled}
          className={validation.rowErrors.mealType ? ERROR_BORDER : ""}
          onChange={(event) => actions.updateRowField(draft.id, "mealType", event.target.value)}
        />
      </div>
      <RemoveIconButton label={`Remove row ${draft.rowNumber}`} disabled={disabled} onClick={() => actions.removeRow(draft.id)} />
    </div>
  );
}
