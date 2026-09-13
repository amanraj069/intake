"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { User } from "@/lib/api";
import type { BodyProfile, NutritionPlan } from "@/types/onboarding";

export type OnboardingStage = "profile" | "review";

export interface OnboardingPlanController {
  stage: OnboardingStage;
  profile: BodyProfile | null;
  plan: NutritionPlan | null;
  generating: boolean;
  saving: boolean;
  error: string | null;
  generatePlan: (profile: BodyProfile) => Promise<void>;
  /** Saves the plan as the user's goal and resolves with the updated user. */
  acceptPlan: () => Promise<User | null>;
  editProfile: () => void;
}

/**
 * Onboarding as two stages: measurements in, a recommended plan out. Nothing
 * is saved until the user accepts the plan on the review stage.
 */
export function useOnboardingPlan(): OnboardingPlanController {
  const [stage, setStage] = useState<OnboardingStage>("profile");
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (nextProfile: BodyProfile) => {
    setGenerating(true);
    setError(null);
    try {
      const response = await api.generatePlan(nextProfile);
      if (!response.data?.plan) throw new Error("The server did not return a plan");

      setProfile(nextProfile);
      setPlan(response.data.plan);
      setStage("review");
    } catch (cause) {
      setError(toErrorMessage(cause, "Could not calculate your plan. Please try again."));
    } finally {
      setGenerating(false);
    }
  }, []);

  const acceptPlan = useCallback(async (): Promise<User | null> => {
    if (!profile || !plan) return null;

    setSaving(true);
    setError(null);
    try {
      const response = await api.completeOnboarding(profile, plan.targets);
      return response.data?.user ?? null;
    } catch (cause) {
      setError(toErrorMessage(cause, "Could not save your goals. Please try again."));
      return null;
    } finally {
      setSaving(false);
    }
  }, [profile, plan]);

  const editProfile = useCallback(() => {
    setError(null);
    setStage("profile");
  }, []);

  return { stage, profile, plan, generating, saving, error, generatePlan, acceptPlan, editProfile };
}
