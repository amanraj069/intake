import type { User } from "./authApi";

/**
 * Where a signed-in user belongs. Until they have entered their body profile
 * there are no goals to measure anything against, so onboarding comes first.
 */
export function homeRouteFor(user: Pick<User, "onboardingCompleted">): string {
  return user.onboardingCompleted ? "/dashboard" : "/onboarding";
}
