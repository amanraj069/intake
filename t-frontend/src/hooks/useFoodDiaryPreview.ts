"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { toAiRequestFailure, type AiRequestFailure } from "@/lib/aiRequestFailure";
import { asPdfUpload, foodDiaryPdfFileError } from "@/lib/foodDiaryPdfFile";
import { waitForImportJob } from "@/lib/importJobPolling";
import type { FoodDiaryImportJob, FoodDiaryPreview } from "@/types/foodImport";

export type PreviewStatus = "idle" | "parsing" | "failed" | "done";

interface UseFoodDiaryPreviewResult {
  status: PreviewStatus;
  failure: AiRequestFailure | null;
  preview: FoodDiaryPreview | null;
  /** The queued import's latest state while parsing; null until the upload is accepted. */
  job: FoodDiaryImportJob | null;
  /** Resolves with the preview, or null when the file was rejected, parsing failed or was cancelled. */
  parse: (file: File) => Promise<FoodDiaryPreview | null>;
  /** Stops waiting for the import in flight and returns to the empty state. */
  reset: () => void;
}

const PARSE_FALLBACK_MESSAGE = "Something went wrong while reading the PDF.";

async function uploadForImport(file: File, signal: AbortSignal): Promise<string> {
  const response = await api.startFoodDiaryImport(asPdfUpload(file), signal);
  if (!response.data?.jobId) throw new ApiError("The server did not start the import.", 502, undefined, "AI_BAD_RESPONSE");
  return response.data.jobId;
}

/**
 * Uploads one PDF, then follows its import job on the server until the rows
 * are ready. A new parse, a cancel or leaving the page stops following it, so
 * a stale result can never replace the rows of a newer file.
 */
export function useFoodDiaryPreview(): UseFoodDiaryPreviewResult {
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [failure, setFailure] = useState<AiRequestFailure | null>(null);
  const [preview, setPreview] = useState<FoodDiaryPreview | null>(null);
  const [job, setJob] = useState<FoodDiaryImportJob | null>(null);
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
      setJob(null);

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
        const jobId = await uploadForImport(file, controller.signal);
        const finished = await waitForImportJob(jobId, controller.signal, setJob);
        if (controller.signal.aborted) return null;

        if (!finished.result) {
          fail(finished.error ?? { message: PARSE_FALLBACK_MESSAGE, code: "UNKNOWN", retryable: true });
          return null;
        }
        setPreview(finished.result);
        setStatus("done");
        return finished.result;
      } catch (cause) {
        if (controller.signal.aborted) return null;
        fail(toAiRequestFailure(cause, PARSE_FALLBACK_MESSAGE));
        return null;
      }
    },
    [fail]
  );

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setPreview(null);
    setJob(null);
    setFailure(null);
    setStatus("idle");
  }, []);

  return { status, failure, preview, job, parse, reset };
}
