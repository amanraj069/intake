import { request } from "./apiClient";
import { idempotencyHeaders } from "./idempotency";
import type { FoodDiaryImportJob, FoodEntryImportResult } from "@/types/foodImport";
import type { FoodEntryInput } from "@/types/nutrition";

export const importApi = {
  /** Uploads a food diary PDF and queues it for reading. Saves nothing; poll the returned job for rows. */
  startFoodDiaryImport: (file: File, signal?: AbortSignal) => {
    const form = new FormData();
    form.append("file", file, file.name);

    return request<{ jobId: string }>("/api/food-entries/import/preview", {
      method: "POST",
      body: form,
      signal,
    });
  },

  getFoodDiaryImportJob: (jobId: string, signal?: AbortSignal) =>
    request<FoodDiaryImportJob>(`/api/food-entries/import/jobs/${encodeURIComponent(jobId)}`, { signal }),

  /** Saves reviewed rows; invalid rows and exact duplicates come back as skipped. */
  confirmFoodDiaryImport: (entries: FoodEntryInput[], idempotencyKey?: string) =>
    request<FoodEntryImportResult>("/api/food-entries/import/confirm", {
      method: "POST",
      body: JSON.stringify({ entries }),
      headers: idempotencyHeaders(idempotencyKey),
    }),
};
