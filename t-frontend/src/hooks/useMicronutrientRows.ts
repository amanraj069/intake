"use client";

import { useCallback, useState } from "react";
import type { MicronutrientRow } from "@/lib/validation/mealForm";
import type { Micronutrients } from "@/types/nutrition";

// A module counter rather than a random id: the same sequence runs on the server
// and on the client, so the first render hydrates without a mismatch.
let nextRowNumber = 0;

function nextRowId(): string {
  nextRowNumber += 1;
  return `micronutrient-${nextRowNumber}`;
}

function createEmptyRow(): MicronutrientRow {
  return { id: nextRowId(), name: "", amount: "", unit: "mg" };
}

/** An entry being edited opens with its saved nutrients, plus a blank row to add to. */
function createInitialRows(micros?: Micronutrients): MicronutrientRow[] {
  const saved = Object.entries(micros ?? {}).map(([name, data]) => {
    const rawVal = data as unknown;
    const amount =
      typeof rawVal === "number"
        ? String(rawVal)
        : typeof rawVal === "object" && rawVal !== null
        ? String((rawVal as { amount?: number }).amount ?? "")
        : "";
    const unit =
      typeof rawVal === "object" && rawVal !== null && (rawVal as { unit?: string }).unit
        ? (rawVal as { unit: string }).unit
        : "mg";

    return {
      id: nextRowId(),
      name,
      amount,
      unit,
    };
  });

  return saved.length > 0 ? saved : [createEmptyRow()];
}

interface UseMicronutrientRowsResult {
  rows: MicronutrientRow[];
  addRow: () => void;
  addNutrientRow: (name: string) => void;
  updateRow: (id: string, changes: Partial<Omit<MicronutrientRow, "id">>) => void;
  removeRow: (id: string) => void;
  setAllRows: (newRows: MicronutrientRow[]) => void;
  /** Swaps every row for the given nutrients, as when a photo draft fills the form. */
  replaceWithMicros: (micros?: Micronutrients) => void;
}

/** Owns the add/edit/remove state for the meal form's nutrient name-value rows. */
export function useMicronutrientRows(initialMicros?: Micronutrients): UseMicronutrientRowsResult {
  const [rows, setRows] = useState<MicronutrientRow[]>(() => createInitialRows(initialMicros));

  const addRow = useCallback(() => {
    setRows((current) => [...current, createEmptyRow()]);
  }, []);

  const addNutrientRow = useCallback((name: string) => {
    setRows((current) => {
      const emptyIndex = current.findIndex((r) => !r.name.trim() && !r.amount.trim());
      if (emptyIndex !== -1) {
        return current.map((r, i) => (i === emptyIndex ? { ...r, name, unit: "mg" } : r));
      }
      return [...current, { id: nextRowId(), name, amount: "", unit: "mg" }];
    });
  }, []);

  const updateRow = useCallback(
    (id: string, changes: Partial<Omit<MicronutrientRow, "id">>) => {
      setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)));
    },
    []
  );

  const removeRow = useCallback((id: string) => {
    // Never drop the last row: an empty pair is the form's resting state.
    setRows((current) =>
      current.length === 1 ? [createEmptyRow()] : current.filter((row) => row.id !== id)
    );
  }, []);

  const setAllRows = useCallback((newRows: MicronutrientRow[]) => {
    setRows(newRows.length > 0 ? newRows : [createEmptyRow()]);
  }, []);

  const replaceWithMicros = useCallback((micros?: Micronutrients) => {
    setRows(createInitialRows(micros));
  }, []);

  return { rows, addRow, addNutrientRow, updateRow, removeRow, setAllRows, replaceWithMicros };
}
