"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
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
  const idempotency = useIdempotencyKey();

  const confirm = useCallback(async (entries: FoodEntryInput[]) => {
    setSubmitting(true);
    setError(null);

    try {
      // A retry of the same rows replays the first import's result instead of reporting every row as a duplicate.
      const key = idempotency.keyFor(JSON.stringify(entries));
      const response = await api.confirmFoodDiaryImport(entries, key);
      if (!response.data) throw new Error("The server did not return an import result");

      idempotency.reset();
      setResult(response.data);
      return response.data;
    } catch (cause) {
      setError(toErrorMessage(cause, "The import could not be saved. Check your meals list before trying again."));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [idempotency]);

  const reset = useCallback(() => {
    idempotency.reset();
    setError(null);
    setResult(null);
  }, [idempotency]);

  return { submitting, error, result, confirm, reset };
}
