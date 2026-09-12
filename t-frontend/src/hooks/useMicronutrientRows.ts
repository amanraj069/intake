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
  const saved = Object.entries(micros ?? {}).map(([name, data]) => ({
    id: nextRowId(),
    name,
    amount: String(data.amount),
    unit: data.unit,
  }));

  return saved.length > 0 ? saved : [createEmptyRow()];
}

interface UseMicronutrientRowsResult {
  rows: MicronutrientRow[];
  addRow: () => void;
  updateRow: (id: string, changes: Partial<Omit<MicronutrientRow, "id">>) => void;
  removeRow: (id: string) => void;
}

/** Owns the add/edit/remove state for the meal form's nutrient name-value rows. */
export function useMicronutrientRows(initialMicros?: Micronutrients): UseMicronutrientRowsResult {
  const [rows, setRows] = useState<MicronutrientRow[]>(() => createInitialRows(initialMicros));

  const addRow = useCallback(() => {
    setRows((current) => [...current, createEmptyRow()]);
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

  return { rows, addRow, updateRow, removeRow };
}
