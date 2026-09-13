import { ApiError } from "./apiClient";

/** Flattens a validation failure's per-field messages to the first message for each field. */
export function toFieldErrors(cause: unknown): Record<string, string> {
  if (!(cause instanceof ApiError) || !cause.errors) return {};

  return Object.fromEntries(
    Object.entries(cause.errors).map(([field, messages]) => [field, messages[0]])
  );
}
