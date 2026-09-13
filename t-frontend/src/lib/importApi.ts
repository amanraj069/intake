import { request } from "./apiClient";
import type { FoodDiaryPreview, FoodEntryImportResult } from "@/types/foodImport";
import type { FoodEntryInput } from "@/types/nutrition";

export const importApi = {
  /** Reads a food diary PDF into reviewable rows. Saves nothing. */
  previewFoodDiaryImport: (file: File, signal?: AbortSignal) => {
    const form = new FormData();
    form.append("file", file, file.name);

    return request<FoodDiaryPreview>("/api/food-entries/import/preview", {
      method: "POST",
      body: form,
      signal,
    });
  },

  /** Saves reviewed rows; invalid rows and exact duplicates come back as skipped. */
  confirmFoodDiaryImport: (entries: FoodEntryInput[]) =>
    request<FoodEntryImportResult>("/api/food-entries/import/confirm", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
};
