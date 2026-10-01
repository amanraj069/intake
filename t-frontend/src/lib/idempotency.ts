/**
 * The server runs a write carrying an `Idempotency-Key` at most once, and
 * answers a repeat with the first response. A key stands for one intended
 * write, so a retry of that write must send the same key.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function idempotencyHeaders(key?: string): Record<string, string> {
  return key ? { "Idempotency-Key": key } : {};
}

/** A chat proposal can only be saved once, so its own id is the natural key for confirming it. */
export function chatConfirmationKey(messageId: string): string {
  return `chat-confirm-${messageId}`;
}
