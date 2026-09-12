import { authApi } from "./authApi";
import { nutritionApi } from "./nutritionApi";

/** Single entry point for every backend call, composed from per-domain modules. */
export const api = {
  ...authApi,
  ...nutritionApi,
};

export { ApiError, API_URL } from "./apiClient";
export type { ApiResponse } from "./apiClient";
export type { User } from "./authApi";
