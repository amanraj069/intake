"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { FoodEntryImportResult } from "@/types/foodImport";
import type { FoodEntryInput } from "@/types/nutrition";

interface UseConfirmImportResult {
  submitting: boolean;
  error: string | null;
  result: FoodEntryImportResult | null;
  /** Resolves with the result, or null when saving failed (the error is kept for display). */
  confirm: (entries: FoodEntryInput[]) => Promise<FoodEntryImportResult | null>;
  reset: () => void;
}

/** Sends the reviewed rows once, keeping the outcome so the page can summarise it. */
export function useConfirmImport(): UseConfirmImportResult {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FoodEntryImportResult | null>(null);

  const confirm = useCallback(async (entries: FoodEntryInput[]) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await api.confirmFoodDiaryImport(entries);
      if (!response.data) throw new Error("The server did not return an import result");

      setResult(response.data);
      return response.data;
    } catch (cause) {
      setError(toErrorMessage(cause, "The import could not be saved. Check your meals list before trying again."));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { submitting, error, result, confirm, reset };
}
