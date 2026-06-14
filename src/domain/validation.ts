/**
 * Validation — reject impossible/implausible fast inputs (plan §Validation).
 * Pure; idempotent. Never auto-completes; >7d is flagged as suspectClock instead.
 */
import { MAX_PLAUSIBLE_FAST_MS, MIN_FAST_MS } from "./constants";

export interface ValidationResult {
  ok: boolean;
  /** Stable machine code for tests + i18n. */
  code?:
    | "future-start"
    | "end-before-start"
    | "too-short"
    | "suspect-clock"
    | "negative";
  message?: string;
}

export const OK: ValidationResult = { ok: true };

/** Validate a proposed start time against the current clock. */
export function validateStart(startAt: number, now: number): ValidationResult {
  if (startAt > now) {
    return { ok: false, code: "future-start", message: "Start time can't be in the future." };
  }
  return OK;
}

/** Validate a proposed (start, end) pair for a completed fast. */
export function validateEnd(startAt: number, endAt: number): ValidationResult {
  if (endAt <= startAt) {
    return { ok: false, code: "end-before-start", message: "End time must be after the start." };
  }
  const duration = endAt - startAt;
  if (duration < MIN_FAST_MS) {
    return { ok: false, code: "too-short", message: "That fast is too short to record." };
  }
  if (duration > MAX_PLAUSIBLE_FAST_MS) {
    // Flag, never reject outright — let the user fix or discard (suspect clock UX).
    return { ok: false, code: "suspect-clock", message: "That fast ran 7+ days — clock changed?" };
  }
  return OK;
}

/** A custom plan's fasting window must be plausible (1h..23h of a 24h day). */
export function validateCustomFastingMs(fastingMs: number): ValidationResult {
  if (fastingMs <= 0) {
    return { ok: false, code: "negative", message: "Fasting window must be positive." };
  }
  if (fastingMs < MIN_FAST_MS) {
    return { ok: false, code: "too-short", message: "Fasting window is too short." };
  }
  return OK;
}
