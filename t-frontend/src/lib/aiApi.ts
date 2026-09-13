import { request } from "./apiClient";
import type { NutritionExtraction } from "@/types/nutrition";

export const aiApi = {
  /** Reads a draft entry from a food photo or nutrition label. Saves nothing. */
  extractNutritionFromImage: (image: Blob, description?: string, signal?: AbortSignal) => {
    const form = new FormData();
    form.append("image", image, image instanceof File ? image.name : "food-photo.jpg");
    if (description) form.append("description", description);

    return request<NutritionExtraction>("/api/ai/extract-nutrition", {
      method: "POST",
      body: form,
      signal,
    });
  },
};
