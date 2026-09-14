import { aiApi } from "./aiApi";
import { authApi } from "./authApi";
import { chatApi } from "./chatApi";
import { importApi } from "./importApi";
import { nutritionApi } from "./nutritionApi";
import { onboardingApi } from "./onboardingApi";
import { reportsApi } from "./reportsApi";

/** Single entry point for every backend call, composed from per-domain modules. */
export const api = {
  ...aiApi,
  ...authApi,
  ...chatApi,
  ...importApi,
  ...nutritionApi,
  ...onboardingApi,
  ...reportsApi,
};

export { ApiError, API_URL } from "./apiClient";
export type { ApiResponse } from "./apiClient";
export type { RegistrationInput, User } from "./authApi";

