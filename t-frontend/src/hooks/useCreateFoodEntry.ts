"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import type { FoodEntry, FoodEntryInput } from "@/types/nutrition";

interface UseCreateFoodEntryResult {
  submitting: boolean;
  createFoodEntry: (input: FoodEntryInput, photoFile?: File | Blob | null) => Promise<FoodEntry>;
}

/** A photo is identified by what JSON can see of it, since the bytes themselves are not hashed client side. */
function submissionSignature(input: FoodEntryInput, photoFile?: File | Blob | null): string {
  const photo = photoFile ? { size: photoFile.size, type: photoFile.type } : null;
  return JSON.stringify({ input, photo });
}

/**
 * Wraps the create-entry call so pages only track form state, not request
 * state. Resubmitting the same meal after a failure reuses its idempotency
 * key, so a save whose response was lost is not repeated.
 */
export function useCreateFoodEntry(): UseCreateFoodEntryResult {
  const [submitting, setSubmitting] = useState(false);
  const idempotency = useIdempotencyKey();

  const createFoodEntry = useCallback(
    async (input: FoodEntryInput, photoFile?: File | Blob | null): Promise<FoodEntry> => {
      setSubmitting(true);

      try {
        const key = idempotency.keyFor(submissionSignature(input, photoFile));
        const response = await api.createFoodEntry(input, photoFile, key);
        const created = response.data?.foodEntry;
        if (!created) {
          throw new Error("The server did not return the created entry");
        }

        idempotency.reset();
        return created;
      } finally {
        setSubmitting(false);
      }
    },
    [idempotency]
  );

  return { submitting, createFoodEntry };
}
