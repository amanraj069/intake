"use client";

import { useCallback, useMemo, useRef } from "react";
import { newIdempotencyKey } from "@/lib/idempotency";

interface UseIdempotencyKeyResult {
  /** The key for submitting `signature`: the same one on a retry, a new one once the payload changes. */
  keyFor: (signature: string) => string;
  /** Forgets the key after a success, so submitting the same values again is a new write. */
  reset: () => void;
}

/**
 * One key per intended write. A double tap, or "Try again" after a dropped
 * connection, resends the same payload with the same key, so the server
 * replays the first save instead of saving twice.
 */
export function useIdempotencyKey(): UseIdempotencyKeyResult {
  const current = useRef<{ signature: string; key: string } | null>(null);

  const keyFor = useCallback((signature: string) => {
    if (current.current?.signature !== signature) {
      current.current = { signature, key: newIdempotencyKey() };
    }
    return current.current.key;
  }, []);

  const reset = useCallback(() => {
    current.current = null;
  }, []);

  return useMemo(() => ({ keyFor, reset }), [keyFor, reset]);
}
