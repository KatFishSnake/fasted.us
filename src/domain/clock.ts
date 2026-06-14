/**
 * Clock — the single source of "now" for the whole app.
 *
 * State is a pure function of stored absolute timestamps + the current clock.
 * Nothing in the domain calls Date.now() directly; it takes a Clock so tests
 * can inject a deterministic time and the SW/window share identical logic.
 */
export interface Clock {
  /** Epoch milliseconds (UTC). */
  now(): number;
}

export const SystemClock: Clock = {
  now: () => Date.now(),
};

/** A clock frozen at a fixed instant — for tests and deterministic fixtures. */
export function fixedClock(epochMs: number): Clock {
  return { now: () => epochMs };
}
