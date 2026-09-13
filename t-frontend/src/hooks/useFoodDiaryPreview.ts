"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { toAiRequestFailure, type AiRequestFailure } from "@/lib/aiRequestFailure";
import { asPdfUpload, foodDiaryPdfFileError } from "@/lib/foodDiaryPdfFile";
import type { FoodDiaryPreview } from "@/types/foodImport";

export type PreviewStatus = "idle" | "parsing" | "failed" | "done";

interface UseFoodDiaryPreviewResult {
  status: PreviewStatus;
  failure: AiRequestFailure | null;
  preview: FoodDiaryPreview | null;
  /** Resolves with the preview, or null when the file was rejected, parsing failed or was cancelled. */
  parse: (file: File) => Promise<FoodDiaryPreview | null>;
  /** Aborts any request in flight and returns to the empty state. */
  reset: () => void;
}

/**
 * Sends one PDF to the preview endpoint at a time. A new parse, a cancel or
 * leaving the page aborts the request in flight, so a stale result can never
 * replace the rows of a newer file.
 */
export function useFoodDiaryPreview(): UseFoodDiaryPreviewResult {
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [failure, setFailure] = useState<AiRequestFailure | null>(null);
  const [preview, setPreview] = useState<FoodDiaryPreview | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const fail = useCallback((next: AiRequestFailure) => {
    setFailure(next);
    setStatus("failed");
  }, []);

  const parse = useCallback(
    async (file: File) => {
      controllerRef.current?.abort();
      setPreview(null);

      const rejection = foodDiaryPdfFileError(file);
      if (rejection) {
        fail({ message: rejection, code: "CLIENT_REJECTED", retryable: false });
        return null;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      setFailure(null);
      setStatus("parsing");

      try {
        const response = await api.previewFoodDiaryImport(asPdfUpload(file), controller.signal);
        if (controller.signal.aborted) return null;
        if (!response.data) throw new ApiError("The server returned no rows.", 502, undefined, "AI_BAD_RESPONSE");

        setPreview(response.data);
        setStatus("done");
        return response.data;
      } catch (cause) {
        if (controller.signal.aborted) return null;
        fail(toAiRequestFailure(cause, "Something went wrong while reading the PDF."));
        return null;
      }
    },
    [fail]
  );

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setPreview(null);
    setFailure(null);
    setStatus("idle");
  }, []);

  return { status, failure, preview, parse, reset };
}
