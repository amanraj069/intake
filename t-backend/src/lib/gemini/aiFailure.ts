import { AppError } from '../../middleware/errorHandler';
import { GeminiRequestError, GeminiUnavailableError } from './geminiErrors';

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
 * Maps a provider failure onto the shared error shape. Anything that is not a
 * recognised provider failure is returned unchanged for the caller to rethrow.
 */
export function toAiAppError(cause: unknown, copy: AiFailureCopy): unknown {
  if (cause instanceof GeminiUnavailableError) {
    console.error(`[${copy.logLabel}] AI unavailable:`, cause.message);
    return new AppError(copy.unavailableMessage, 503, 'AI_UNAVAILABLE');
  }

  if (cause instanceof GeminiRequestError && cause.kind === 'invalid-request') {
    console.error(`[${copy.logLabel}] AI rejected the request:`, cause.message);
    return new AppError(copy.rejectedMessage, 422, copy.rejectedCode);
  }

  return cause;
}
