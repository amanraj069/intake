import { ApiError } from "./apiClient";

export interface AiRequestFailure {
  message: string;
  /** The server's failure code, or `CLIENT_REJECTED` when the file never left the browser. */
  code: string;
  /** Whether sending the same file again could plausibly succeed. */
  retryable: boolean;
}

/**
 * Failures caused by the service rather than the file: the same file is worth
 * another try. An expired import job counts too, since uploading again starts a new one.
 */
const TRANSIENT_CODES = new Set(["AI_UNAVAILABLE", "AI_BAD_RESPONSE", "NETWORK", "IMPORT_FAILED", "IMPORT_JOB_NOT_FOUND"]);

/** Classifies a failed AI upload so the UI can decide whether to offer "Try again". */
export function toAiRequestFailure(cause: unknown, fallbackMessage: string): AiRequestFailure {
  if (cause instanceof ApiError) {
    const code = cause.code ?? (cause.status === 0 ? "NETWORK" : "UNKNOWN");
    return { message: cause.message, code, retryable: TRANSIENT_CODES.has(code) || cause.status >= 500 };
  }
  return { message: fallbackMessage, code: "UNKNOWN", retryable: true };
}
