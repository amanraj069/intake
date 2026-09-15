import { AppError } from '../../middleware/errorHandler';
import { GeminiKeysExhaustedError, GeminiRequestError, GeminiUnavailableError } from './geminiErrors';

/** The user-facing wording one AI feature uses for the provider failures it can hit. */
export interface AiFailureCopy {
  /** Prefix for server logs, e.g. `NutritionExtraction`. */
  logLabel: string;
  unavailableMessage: string;
  /** Shown when no key or model accepts the request, which points at the input itself. */
  rejectedMessage: string;
  rejectedCode: string;
}

/**
 * Maps a provider failure onto the shared error shape. Every Gemini error type
 * is covered, so a failure kind added later still reaches the user as a clear
 * message. Anything that is not a provider failure (a bug, a database error)
 * is returned unchanged for the caller to rethrow.
 */
export function toAiAppError(cause: unknown, copy: AiFailureCopy): unknown {
  if (cause instanceof GeminiRequestError && cause.kind === 'invalid-request') {
    console.error(`[${copy.logLabel}] AI rejected the request:`, cause.message);
    return new AppError(copy.rejectedMessage, 422, copy.rejectedCode);
  }

  const isProviderFailure =
    cause instanceof GeminiUnavailableError ||
    cause instanceof GeminiRequestError ||
    cause instanceof GeminiKeysExhaustedError;

  if (isProviderFailure) {
    console.error(`[${copy.logLabel}] AI unavailable:`, cause.message);
    return new AppError(copy.unavailableMessage, 503, 'AI_UNAVAILABLE');
  }

  return cause;
}
