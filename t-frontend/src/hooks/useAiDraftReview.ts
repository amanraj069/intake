"use client";

import { useCallback, useState } from "react";
import type { ExtractionAnalysis } from "@/types/nutrition";

const UNCONFIRMED_MESSAGE = "Confirm you have reviewed the details filled in from your photo.";

interface UseAiDraftReviewResult {
  /** How the AI read the photo, or null when the form holds no AI draft. */
  analysis: ExtractionAnalysis | null;
  confirmed: boolean;
  error?: string;
  start: (analysis: ExtractionAnalysis) => void;
  clear: () => void;
  setConfirmed: (confirmed: boolean) => void;
  /** True when saving may go ahead; otherwise flags the missing confirmation. */
  checkReadyToSave: () => boolean;
}

/**
 * An AI draft is a guess, so the form will not save one until the user has
 * explicitly confirmed they reviewed it. Any new draft resets that confirmation.
 */
export function useAiDraftReview(): UseAiDraftReviewResult {
  const [analysis, setAnalysis] = useState<ExtractionAnalysis | null>(null);
  const [confirmed, setConfirmedState] = useState(true);
  const [showError, setShowError] = useState(false);

  const start = useCallback((next: ExtractionAnalysis) => {
    setAnalysis(next);
    setConfirmedState(true);
    setShowError(false);
  }, []);

  const clear = useCallback(() => {
    setAnalysis(null);
    setConfirmedState(true);
    setShowError(false);
  }, []);

  const setConfirmed = useCallback((next: boolean) => {
    setConfirmedState(next);
    if (next) setShowError(false);
  }, []);

  const checkReadyToSave = useCallback(() => {
    const ready = !analysis || confirmed;
    setShowError(!ready);
    return ready;
  }, [analysis, confirmed]);

  return {
    analysis,
    confirmed,
    error: showError ? UNCONFIRMED_MESSAGE : undefined,
    start,
    clear,
    setConfirmed,
    checkReadyToSave,
  };
}
