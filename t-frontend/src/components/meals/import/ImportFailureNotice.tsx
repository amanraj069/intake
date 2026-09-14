"use client";

import Button from "@/components/ui/Button";
import type { AiRequestFailure } from "@/lib/aiRequestFailure";

const TITLES: Record<string, string> = {
  CLIENT_REJECTED: "Unsupported file",
  UNSUPPORTED_FILE_TYPE: "Unsupported file",
  PDF_TOO_LARGE: "PDF too large",
  PDF_TOO_LONG: "PDF too long",
  PDF_UNREADABLE: "PDF not readable",
  PDF_ENCRYPTED: "PDF is password protected",
  PDF_NO_TEXT: "No text in this PDF",
  PDF_UNPROCESSABLE: "PDF not readable",
  NOT_A_FOOD_DIARY: "Not a food diary",
  NO_ENTRIES_FOUND: "No entries found",
  AI_UNAVAILABLE: "Import unavailable",
  AI_BAD_RESPONSE: "Parsing incomplete",
  NETWORK: "Connection problem",
};

interface ImportFailureNoticeProps {
  fileName: string | null;
  failure: AiRequestFailure;
  onRetry: () => void;
  onChooseAnother: () => void;
}

/** Explains why a PDF could not be parsed, and offers every way forward. */
export default function ImportFailureNotice({ fileName, failure, onRetry, onChooseAnother }: ImportFailureNoticeProps) {
  return (
    <div
      role="alert"
      className="space-y-4 rounded-2xl bg-bg-card dark:bg-dark-bg-card border border-black/5 dark:border-white/10 shadow-sm p-5 sm:p-6"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-error dark:bg-error-dark" aria-hidden="true" />
          <p className="text-sm font-bold text-error dark:text-error-dark">
            {TITLES[failure.code] ?? "Could not read the PDF"}
          </p>
        </div>
        {fileName && (
          <p className="mt-1 truncate text-xs font-light text-text-secondary dark:text-dark-text-secondary">{fileName}</p>
        )}
        <p className="mt-2 text-sm font-light leading-relaxed text-text-primary dark:text-dark-text">{failure.message}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {failure.retryable && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={onChooseAnother} className="border border-border dark:border-dark-border shadow-2xs">
          Choose another PDF
        </Button>
      </div>
    </div>
  );
}
