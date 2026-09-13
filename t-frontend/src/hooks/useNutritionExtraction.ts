"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { toAiRequestFailure, type AiRequestFailure } from "@/lib/aiRequestFailure";
import { foodImageFileError, prepareFoodImageForUpload } from "@/lib/foodImageFile";
import type { NutritionExtraction } from "@/types/nutrition";

export type ExtractionStatus = "idle" | "analysing" | "failed" | "done";

export type ExtractionFailure = AiRequestFailure;

interface UseNutritionExtractionResult {
  status: ExtractionStatus;
  previewUrl: string | null;
  failure: ExtractionFailure | null;
  /** Resolves with the draft, or null when the photo was rejected, failed or was cancelled. */
  extract: (file: File, description?: string) => Promise<NutritionExtraction | null>;
  retry: () => Promise<NutritionExtraction | null>;
  /** Aborts any request in flight and returns to the empty state. */
  reset: () => void;
}

/**
 * Runs one photo through the extraction endpoint at a time. Owns the preview
 * URL and the in-flight request, so a new photo, a cancel or leaving the page
 * aborts the previous attempt and its result can never overwrite a newer one.
 */
export function useNutritionExtraction(): UseNutritionExtractionResult {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<ExtractionFailure | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const lastAttemptRef = useRef<{ file: File; description?: string } | null>(null);

  // Mirrors `previewUrl` so the unmount cleanup can revoke it without reading stale state.
  const previewUrlRef = useRef<string | null>(null);

  const replacePreview = useCallback((file: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(previewUrlRef.current);
  }, []);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const extract = useCallback(
    async (file: File, description?: string) => {
      controllerRef.current?.abort();
      lastAttemptRef.current = { file, description };
      replacePreview(file);

      const rejection = foodImageFileError(file);
      if (rejection) {
        setFailure({ message: rejection, code: "CLIENT_REJECTED", retryable: false });
        setStatus("failed");
        return null;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      setFailure(null);
      setStatus("analysing");

      try {
        const upload = await prepareFoodImageForUpload(file);
        const response = await api.extractNutritionFromImage(upload, description, controller.signal);
        if (controller.signal.aborted) return null;
        if (!response.data) throw new ApiError("The server returned no draft.", 502, undefined, "AI_BAD_RESPONSE");

        setStatus("done");
        return response.data;
      } catch (cause) {
        if (controller.signal.aborted) return null;
        setFailure(toAiRequestFailure(cause, "Something went wrong while reading the photo."));
        setStatus("failed");
        return null;
      }
    },
    [replacePreview]
  );

  const retry = useCallback(async () => {
    const lastAttempt = lastAttemptRef.current;
    return lastAttempt ? extract(lastAttempt.file, lastAttempt.description) : null;
  }, [extract]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    lastAttemptRef.current = null;
    replacePreview(null);
    setFailure(null);
    setStatus("idle");
  }, [replacePreview]);

  return { status, previewUrl, failure, extract, retry, reset };
}
