"use client";

import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import { useImportRows } from "@/hooks/useImportRows";
import type { FoodDiaryPreview } from "@/types/foodImport";
import type { FoodEntryInput } from "@/types/nutrition";
import ImportRowEditor from "./ImportRowEditor";

interface ImportReviewTableProps {
  preview: FoodDiaryPreview;
  fileName: string;
  submitting: boolean;
  error: string | null;
  /** `rowNumbers` gives each entry's PDF row, since removed rows leave gaps in the submitted list. */
  onConfirm: (entries: FoodEntryInput[], rowNumbers: number[]) => void;
  onStartOver: () => void;
}

function describeBlockers(invalidCount: number, unreviewedCount: number, rowCount: number): string {
  if (rowCount === 0) return "Every row was removed. Start over to parse a PDF again.";

  const parts = [
    invalidCount > 0 ? `${invalidCount} ${invalidCount === 1 ? "row needs" : "rows need"} fixing` : null,
    unreviewedCount > 0 ? `${unreviewedCount} flagged ${unreviewedCount === 1 ? "row needs" : "rows need"} a check` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? `${parts.join(" and ")} before importing.`
    : `${rowCount} ${rowCount === 1 ? "entry is" : "entries are"} ready to import.`;
}

/** The parsed rows, editable and removable, with the final import step once every row is valid and checked. */
export default function ImportReviewTable({ preview, fileName, submitting, error, onConfirm, onStartOver }: ImportReviewTableProps) {
  const { rows, invalidCount, unreviewedCount, payloads, rowNumbers, ...actions } = useImportRows(preview.rows);

  return (
    <section aria-label="Review imported rows" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-text-primary dark:text-dark-text">Review {rows.length} entries</h2>
          <p className="text-sm font-light text-text-secondary dark:text-dark-text-secondary break-words">
            Read from {fileName} ({preview.pageCount} {preview.pageCount === 1 ? "page" : "pages"}). Nothing is saved until you confirm.
          </p>
          {preview.warnings.length > 0 && (
            <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>

        <Button 
          type="button" 
          variant="secondary" 
          onClick={actions.markAllReviewed} 
          disabled={submitting || unreviewedCount === 0}
          className="shrink-0"
        >
          {unreviewedCount === 0 ? "All checked" : "Mark all as checked"}
        </Button>
      </div>

      <ul className="space-y-4">
        {rows.map((row) => (
          <ImportRowEditor key={row.draft.id} row={row} disabled={submitting} actions={actions} />
        ))}
      </ul>

      {error && <FormError message={error} />}

      <div className="sm:sticky sm:bottom-4 z-10 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-bg-card dark:bg-dark-bg-card border border-black/5 dark:border-white/10 shadow-sm p-4 sm:p-5">
        <p className="flex-1 text-sm font-light text-text-primary dark:text-dark-text" aria-live="polite">
          {describeBlockers(invalidCount, unreviewedCount, rows.length)}
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="ghost" onClick={onStartOver} disabled={submitting}>
            Start over
          </Button>
          <Button type="button" disabled={!payloads} loading={submitting} onClick={() => payloads && onConfirm(payloads, rowNumbers)}>
            Confirm Import
          </Button>
        </div>
      </div>
    </section>
  );
}
