import { ApiError } from "./apiClient";

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

/** Normalises any thrown value into a message that is safe to show the user. */
export function toErrorMessage(cause: unknown, fallback: string = DEFAULT_MESSAGE): string {
  return cause instanceof ApiError ? cause.message : fallback;
}
