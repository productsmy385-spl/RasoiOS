"use client";

import { useCallback, useRef } from "react";

/**
 * One idempotency key per submit *attempt*, reused on retry (ADR-010 §7, api.md SA-ORD-01).
 *
 * `current()` mints a key the first time it is asked and then keeps handing back the same one, so a double tap, a lost
 * response or a manual "try again" all replay the original order instead of creating a second. `reset()` is called
 * once the server has confirmed the order — the next submit is then genuinely a new order.
 */
export function useIdempotencyKey(): { current: () => string; reset: () => void } {
  const key = useRef<string | null>(null);
  const current = useCallback(() => {
    key.current ??= crypto.randomUUID();
    return key.current;
  }, []);
  const reset = useCallback(() => {
    key.current = null;
  }, []);
  return { current, reset };
}
