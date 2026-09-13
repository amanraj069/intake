"use client";

import { useCallback, useMemo, useState } from "react";
import {
  createEmptyImportItem,
  previewRowToDraft,
  validateImportRow,
  type ImportItemDraft,
  type ImportItemField,
  type ImportRowDraft,
  type ImportRowField,
  type ImportRowValidation,
} from "@/lib/validation/importRow";
import type { ImportPreviewRow } from "@/types/foodImport";
import type { FoodEntryInput, FoodItemUnit, MealType } from "@/types/nutrition";

export interface ReviewedImportRow {
  draft: ImportRowDraft;
  validation: ImportRowValidation;
}

export interface ImportRowActions {
  updateRowField: (rowId: string, field: ImportRowField, value: string) => void;
  updateItemField: (rowId: string, itemId: string, field: ImportItemField, value: string) => void;
  addItem: (rowId: string) => void;
  removeItem: (rowId: string, itemId: string) => void;
  markReviewed: (rowId: string) => void;
  markAllReviewed: () => void;
  removeRow: (rowId: string) => void;
}

interface UseImportRowsResult extends ImportRowActions {
  rows: ReviewedImportRow[];
  /** Rows with a field that would fail validation. */
  invalidCount: number;
  /** Flagged rows the user has neither edited nor marked as checked. */
  unreviewedCount: number;
  /** Every row's entry, or null while any row is invalid or unreviewed. */
  payloads: FoodEntryInput[] | null;
  /** The PDF row number of each payload, in the same order. */
  rowNumbers: number[];
}

function withItemField(item: ImportItemDraft, field: ImportItemField, value: string): ImportItemDraft {
  return field === "unit" ? { ...item, unit: value as FoodItemUnit } : { ...item, [field]: value };
}

/**
 * Holds the editable copy of the preview rows. Rows the server flagged must be
 * looked at before import: any edit to the row or its items, or confirming the
 * row as read, counts as that look.
 */
export function useImportRows(previewRows: readonly ImportPreviewRow[]): UseImportRowsResult {
  const [drafts, setDrafts] = useState<ImportRowDraft[]>(() => previewRows.map(previewRowToDraft));

  const editRow = useCallback((rowId: string, change: (draft: ImportRowDraft) => ImportRowDraft) => {
    setDrafts((current) => current.map((draft) => (draft.id === rowId ? { ...change(draft), reviewed: true } : draft)));
  }, []);

  const actions: ImportRowActions = useMemo(
    () => ({
      updateRowField: (rowId, field, value) =>
        editRow(rowId, (draft) =>
          field === "mealType" ? { ...draft, mealType: value as MealType | "" } : { ...draft, [field]: value }
        ),
      updateItemField: (rowId, itemId, field, value) =>
        editRow(rowId, (draft) => ({
          ...draft,
          items: draft.items.map((item) => (item.id === itemId ? withItemField(item, field, value) : item)),
        })),
      addItem: (rowId) => editRow(rowId, (draft) => ({ ...draft, items: [...draft.items, createEmptyImportItem()] })),
      removeItem: (rowId, itemId) =>
        editRow(rowId, (draft) => ({ ...draft, items: draft.items.filter((item) => item.id !== itemId) })),
      markReviewed: (rowId) => editRow(rowId, (draft) => draft),
      markAllReviewed: () => setDrafts((current) => current.map((draft) => ({ ...draft, reviewed: true }))),
      removeRow: (rowId) => setDrafts((current) => current.filter((draft) => draft.id !== rowId)),
    }),
    [editRow]
  );

  const rows = useMemo(() => drafts.map((draft) => ({ draft, validation: validateImportRow(draft) })), [drafts]);

  const invalidCount = rows.filter((row) => !row.validation.payload).length;
  const unreviewedCount = rows.filter((row) => !row.draft.reviewed).length;
  const canImport = rows.length > 0 && invalidCount === 0 && unreviewedCount === 0;
  const payloads = canImport ? rows.map((row) => row.validation.payload as FoodEntryInput) : null;
  const rowNumbers = rows.map((row) => row.draft.rowNumber);

  return { rows, invalidCount, unreviewedCount, payloads, rowNumbers, ...actions };
}
