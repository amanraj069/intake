"use client";

import { useCallback, useState } from "react";
import type { MicronutrientRow } from "@/lib/validation/mealForm";

// A module counter rather than a random id: the same sequence runs on the server
// and on the client, so the first render hydrates without a mismatch.
let nextRowNumber = 0;

function createEmptyRow(): MicronutrientRow {
  nextRowNumber += 1;
  return { id: `micronutrient-${nextRowNumber}`, name: "", amount: "" };
}

interface UseMicronutrientRowsResult {
  rows: MicronutrientRow[];
  addRow: () => void;
  updateRow: (id: string, changes: Partial<Omit<MicronutrientRow, "id">>) => void;
  removeRow: (id: string) => void;
}

/** Owns the add/edit/remove state for the meal form's nutrient name-value rows. */
export function useMicronutrientRows(): UseMicronutrientRowsResult {
  const [rows, setRows] = useState<MicronutrientRow[]>(() => [createEmptyRow()]);

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
