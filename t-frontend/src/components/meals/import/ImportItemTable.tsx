"use client";

import type { ImportRowActions, ReviewedImportRow } from "@/hooks/useImportRows";
import type { ImportItemDraft } from "@/lib/validation/importRow";
import ImportItemCell from "./ImportItemCell";
import RemoveIconButton from "./RemoveIconButton";
import { IMPORT_ITEM_COLUMNS, IMPORT_ITEM_GRID, IMPORT_NUTRIENT_COLUMNS, type ImportNutrientField } from "./importTableLayout";

const HEADER_TEXT = "text-xs font-bold text-text-secondary dark:text-dark-text-secondary";

/** A number while typing, for the running total: blank or invalid text counts as zero. */
function typedAmount(raw: string): number {
  const value = Number(raw.trim());
  return raw.trim() && Number.isFinite(value) ? value : 0;
}

function sumField(items: readonly ImportItemDraft[], field: ImportNutrientField): number {
  const total = items.reduce((sum, item) => sum + typedAmount(item[field]), 0);
  return field === "calories" ? Math.round(total) : Math.round(total * 10) / 10;
}

function ColumnHeader() {
  return (
    <div aria-hidden="true" className={`hidden lg:grid ${IMPORT_ITEM_GRID} px-1 pb-1`}>
      {IMPORT_ITEM_COLUMNS.map((column) => (
        <span key={column.field} className={`${HEADER_TEXT} ${column.accent ?? ""}`}>
          {column.label}
          {column.unitLabel && <span className="ml-1 font-light">{column.unitLabel}</span>}
        </span>
      ))}
    </div>
  );
}

function TotalsLine({ items }: { items: readonly ImportItemDraft[] }) {
  return (
    <div className={`${IMPORT_ITEM_GRID} mt-3 border-t border-black/5 dark:border-white/10 px-1 pt-3 tabular-nums`}>
      <p className="col-span-2 sm:col-span-4 lg:col-span-3 text-sm font-bold text-text-primary dark:text-dark-text">Total</p>
      {IMPORT_NUTRIENT_COLUMNS.map((column) => (
        <p key={column.field} className="text-sm font-bold text-text-primary dark:text-dark-text">
          <span className={`lg:sr-only mr-1 text-xs font-semibold ${column.accent}`}>{column.label}</span>
          {sumField(items, column.field)}
          <span className="ml-1 text-xs font-light text-text-secondary dark:text-dark-text-secondary">{column.unitLabel}</span>
        </p>
      ))}
    </div>
  );
}

interface ImportItemTableProps {
  row: ReviewedImportRow;
  disabled: boolean;
  actions: ImportRowActions;
}

/** A meal's dishes as an editable table: column names, one line per dish, an add control, and the meal's totals. */
export default function ImportItemTable({ row, disabled, actions }: ImportItemTableProps) {
  const { draft, validation } = row;

  return (
    <div className="mt-4">
      <ColumnHeader />

      <ul className="space-y-3 lg:space-y-2">
        {draft.items.map((item, index) => (
          <li key={item.id} className={`${IMPORT_ITEM_GRID} rounded-lg border border-black/5 dark:border-white/10 p-3 lg:border-0 lg:p-0`}>
            {IMPORT_ITEM_COLUMNS.map((column) => (
              <div key={column.field} className={column.cardSpan ?? ""}>
                <ImportItemCell
                  column={column}
                  item={item}
                  hasError={Boolean(validation.itemErrors[item.id]?.[column.field])}
                  disabled={disabled}
                  onChange={(value) => actions.updateItemField(draft.id, item.id, column.field, value)}
                />
              </div>
            ))}
            <RemoveIconButton
              label={`Remove dish ${index + 1} from row ${draft.rowNumber}`}
              disabled={disabled}
              onClick={() => actions.removeItem(draft.id, item.id)}
              className="col-span-2 sm:col-span-4 lg:col-span-1 justify-self-end"
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => actions.addItem(draft.id)}
        disabled={disabled}
        className="mt-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors cursor-pointer disabled:opacity-40"
      >
        + Add item
      </button>

      <TotalsLine items={draft.items} />
    </div>
  );
}
