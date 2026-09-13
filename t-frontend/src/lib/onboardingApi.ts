import { request } from "./apiClient";
import type { User } from "./authApi";
import type { BodyProfile, DailyTargets, NutritionPlan } from "@/types/onboarding";

export const onboardingApi = {
  generatePlan: (profile: BodyProfile) =>
    request<{ plan: NutritionPlan }>("/api/onboarding/plan", {
      method: "POST",
      body: JSON.stringify(profile),
    }),

  completeOnboarding: (profile: BodyProfile, targets: DailyTargets) =>
    request<{ user: User }>("/api/onboarding/complete", {
      method: "POST",
      body: JSON.stringify({ profile, targets }),
    }),
};
