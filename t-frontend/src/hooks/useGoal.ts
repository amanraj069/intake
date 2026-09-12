"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { Goal, GoalInput } from "@/types/nutrition";

interface UseGoalResult {
  goal: Goal | null;
  loading: boolean;
  loadError: string | null;
  saving: boolean;
  reload: () => void;
  saveGoal: (input: GoalInput) => Promise<Goal>;
}

/**
 * Loads the current user's single active goal and saves updates to it.
 * `goal` stays null while the user has not set one yet, which is not an error.
 */
export function useGoal(): UseGoalResult {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deliberately does not flip `loading` on: the hook starts in the loading
  // state, and `reload` sets it before calling in.
  const fetchGoal = useCallback(async () => {
    try {
      const response = await api.getGoal();
      setGoal(response.data?.goal ?? null);
      setLoadError(null);
    } catch (cause) {
      setLoadError(toErrorMessage(cause, "Could not load your goal."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount is the whole point of this hook, and the resulting state
    // writes all happen after an await. The rule cannot see past the call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchGoal();
  }, [fetchGoal]);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void fetchGoal();
  }, [fetchGoal]);

  const saveGoal = useCallback(async (input: GoalInput): Promise<Goal> => {
    setSaving(true);

    try {
      const response = await api.saveGoal(input);
      const saved = response.data?.goal;

      if (!saved) {
        throw new Error("The server did not return the saved goal");
      }

      setGoal(saved);
      return saved;
    } finally {
      setSaving(false);
    }
  }, []);

  return { goal, loading, loadError, saving, reload, saveGoal };
}
