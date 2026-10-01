"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { MealAccess } from "@/types/sharedMeal";

interface UseRevokeMealAccessResult {
  updating: boolean;
  updateError: string | null;
  /** Resolves to who still has access, or null when the update failed. */
  revokeAccess: (mealId: string, revokeUserIds: string[]) => Promise<MealAccess | null>;
  clearError: () => void;
}

/** Takes a meal away from some of the people it was shared with. */
export function useRevokeMealAccess(): UseRevokeMealAccessResult {
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const clearError = useCallback(() => setUpdateError(null), []);

  const revokeAccess = useCallback(async (mealId: string, revokeUserIds: string[]) => {
    setUpdateError(null);
    setUpdating(true);
    try {
      const response = await api.revokeMealAccess(mealId, revokeUserIds);
      return response.data ?? null;
    } catch (cause) {
      setUpdateError(toErrorMessage(cause, "Could not update who can see this meal."));
      return null;
    } finally {
      setUpdating(false);
    }
  }, []);

  return { updating, updateError, revokeAccess, clearError };
}
