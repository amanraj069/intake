"use client";

import Button from "@/components/ui/Button";
import type { ExtractionFailure } from "@/hooks/useNutritionExtraction";
import PhotoThumbnail from "./PhotoThumbnail";

const TITLES: Record<string, string> = {
  NO_FOOD_DETECTED: "No food found",
  IMAGE_UNCLEAR: "Photo too unclear",
  IMAGE_UNREADABLE: "Photo not readable",
  IMAGE_UNPROCESSABLE: "Photo not readable",
  UNSUPPORTED_IMAGE_TYPE: "Unsupported file",
  IMAGE_TOO_LARGE: "Photo too large",
  CLIENT_REJECTED: "Unsupported file",
  AI_UNAVAILABLE: "Analysis unavailable",
  AI_BAD_RESPONSE: "Analysis incomplete",
  NETWORK: "Connection problem",
};

interface ExtractionFailureNoticeProps {
  previewUrl: string | null;
  failure: ExtractionFailure;
  onRetry: () => void;
  onChooseAnother: () => void;
}

/** Explains why a photo could not be used, and offers every way forward. */
export default function ExtractionFailureNotice({
  previewUrl,
  failure,
  onRetry,
  onChooseAnother,
}: ExtractionFailureNoticeProps) {
  return (
    <div role="alert" className="flex flex-row gap-4 sm:gap-5">
      <PhotoThumbnail src={previewUrl} />

      <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
        <div>
          <p className="text-sm font-bold text-error dark:text-error-dark">
            {TITLES[failure.code] ?? "Could not read the photo"}
          </p>
          <p className="mt-1 text-xs sm:text-sm font-light leading-relaxed text-text-primary dark:text-dark-text">
            {failure.message}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {failure.retryable && (
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={onChooseAnother}>
            Choose another photo
          </Button>
        </div>
      </div>
    </div>
  );
}

