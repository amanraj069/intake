"use client";

import type { ImportRowActions, ReviewedImportRow } from "@/hooks/useImportRows";
import ImportItemTable from "./ImportItemTable";
import ImportRowHeader from "./ImportRowHeader";
import ImportRowNotes from "./ImportRowNotes";

interface ImportRowEditorProps {
  row: ReviewedImportRow;
  disabled: boolean;
  actions: ImportRowActions;
}

/** Every validation message for the row, with dish messages prefixed by the dish they belong to. */
function collectErrorMessages({ draft, validation }: ReviewedImportRow): string[] {
  return [
    ...Object.values(validation.rowErrors),
    ...draft.items.flatMap((item, index) =>
      Object.values(validation.itemErrors[item.id] ?? {}).map((message) => `Dish ${index + 1}: ${message}`)
    ),
  ].filter((message): message is string => Boolean(message));
}

/** One meal from the diary: its details, its dishes as a table with totals, and what needs attention. */
export default function ImportRowEditor({ row, disabled, actions }: ImportRowEditorProps) {
  const { draft } = row;

  return (
    <li className="rounded-2xl border border-black/5 dark:border-white/10 bg-bg-card dark:bg-dark-bg-card p-4 sm:p-5 transition-shadow duration-150 hover:shadow-sm">
      <ImportRowHeader row={row} disabled={disabled} actions={actions} />
      <ImportItemTable row={row} disabled={disabled} actions={actions} />
      <ImportRowNotes
        issues={draft.issues}
        reviewed={draft.reviewed}
        errorMessages={collectErrorMessages(row)}
        disabled={disabled}
        onMarkReviewed={() => actions.markReviewed(draft.id)}
      />
    </li>
  );
}
