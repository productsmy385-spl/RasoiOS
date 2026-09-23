/**
 * Injectable clock (S1-P02-T011). Services read the current instant through `now()` so business-date and timer
 * behaviour can be tested at fixed instants (midnight, DST changes) without faking global timers.
 */
export type Clock = { now(): Date };

export const systemClock: Clock = { now: () => new Date() };

let current: Clock = systemClock;

export function now(): Date {
  return current.now();
}

/** Test-only: replace the clock; returns a function that restores the previous one. */
export function overrideClock(clock: Clock): () => void {
  if (process.env.NODE_ENV === "production") throw new Error("overrideClock is test-only");
  const previous = current;
  current = clock;
  return () => {
    current = previous;
  };
}

/** A clock fixed at `iso` (optionally advanced by tests). */
export function fixedClock(iso: string): Clock & { advance(ms: number): void } {
  let instant = new Date(iso).getTime();
  return {
    now: () => new Date(instant),
    advance: (ms: number) => {
      instant += ms;
    },
  };
}
