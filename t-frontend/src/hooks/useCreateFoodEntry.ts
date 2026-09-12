"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import type { FoodEntry, FoodEntryInput } from "@/types/nutrition";

interface UseCreateFoodEntryResult {
  submitting: boolean;
  createFoodEntry: (input: FoodEntryInput) => Promise<FoodEntry>;
}

/** Wraps the create-entry call so pages only track form state, not request state. */
export function useCreateFoodEntry(): UseCreateFoodEntryResult {
  const [submitting, setSubmitting] = useState(false);

  const createFoodEntry = useCallback(async (input: FoodEntryInput): Promise<FoodEntry> => {
    setSubmitting(true);

    try {
      const response = await api.createFoodEntry(input);
      const created = response.data?.foodEntry;

      if (!created) {
        throw new Error("The server did not return the created entry");
      }

      return created;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, createFoodEntry };
}
