import { authApi } from "./authApi";
import { nutritionApi } from "./nutritionApi";
import { reportsApi } from "./reportsApi";

/** Single entry point for every backend call, composed from per-domain modules. */
export const api = {
  ...authApi,
  ...nutritionApi,
  ...reportsApi,
};

export { ApiError, API_URL } from "./apiClient";
export type { ApiResponse } from "./apiClient";
export type { User } from "./authApi";

