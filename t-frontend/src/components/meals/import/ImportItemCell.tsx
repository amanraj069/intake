"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { LIMITS } from "@/lib/validation/amount";
import type { ImportItemDraft } from "@/lib/validation/importRow";
import { FOOD_ITEM_UNITS } from "@/types/nutrition";
import type { ImportColumn } from "./importTableLayout";

const UNIT_OPTIONS = FOOD_ITEM_UNITS.map((unit) => ({ value: unit, label: unit }));

/** The error colour only: the message itself is listed under the row, where a narrow column cannot squash it. */
const ERROR_BORDER = "border-error dark:border-error-dark";

interface ImportItemCellProps {
  column: ImportColumn;
  item: ImportItemDraft;
  hasError: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}

/** One editable cell of an item line, labelled on cards and named by the header in the table layout. */
export default function ImportItemCell({ column, item, hasError, disabled, onChange }: ImportItemCellProps) {
  const shared = {
    id: `${item.id}-${column.field}`,
    label: column.label,
    density: "compact" as const,
    labelClassName: "lg:sr-only",
    disabled,
    className: hasError ? ERROR_BORDER : "",
    "aria-invalid": hasError,
  };

  if (column.kind === "unit") {
    return <Select {...shared} options={UNIT_OPTIONS} value={item.unit} onChange={(event) => onChange(event.target.value)} />;
  }

  if (column.kind === "amount") {
    return (
      <Input
        {...shared}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={item[column.field as keyof ImportItemDraft]}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input {...shared} maxLength={LIMITS.itemNameLength} value={item.name} onChange={(event) => onChange(event.target.value)} />
  );
}
