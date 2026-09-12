"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { FoodEntry, FoodEntryInput } from "@/types/nutrition";

interface UseFoodEntryResult {
  entry: FoodEntry | null;
  loading: boolean;
  loadError: string | null;
  saving: boolean;
  reload: () => void;
  updateEntry: (changes: FoodEntryInput) => Promise<FoodEntry>;
}

/** Loads a single entry so the edit form can open pre-filled, and saves changes back. */
export function useFoodEntry(id: string): UseFoodEntryResult {
  const [entry, setEntry] = useState<FoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchEntry = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.getFoodEntry(id);
      setEntry(response.data?.foodEntry ?? null);
      setLoadError(null);
    } catch (cause) {
      setLoadError(toErrorMessage(cause, "Could not load this meal."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchEntry();
  }, [fetchEntry]);

  const updateEntry = useCallback(
    async (changes: FoodEntryInput): Promise<FoodEntry> => {
      setSaving(true);

      try {
        const response = await api.updateFoodEntry(id, changes);
        const updated = response.data?.foodEntry;

        if (!updated) {
          throw new Error("The server did not return the updated entry");
        }

        setEntry(updated);
        return updated;
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  return { entry, loading, loadError, saving, reload: fetchEntry, updateEntry };
}
