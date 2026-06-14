/**
 * Domain constants — every magic number lives here (DRY, plan §Data Model).
 * Durations are milliseconds unless noted.
 */
export const MS = {
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
} as const;

/** A fast running longer than this is implausible → suspectClock (never auto-complete). */
export const MAX_PLAUSIBLE_FAST_MS = 7 * MS.DAY;

/** Shorter than this is almost certainly a mis-tap; validation rejects it. */
export const MIN_FAST_MS = 1 * MS.MINUTE;

/** Reminder lead/grace windows. */
export const PRE_START_LEAD_MS = 30 * MS.MINUTE;
export const GRACE_AFTER_START_MS = 30 * MS.MINUTE;

/** Overtime nudges: every hour, capped. */
export const OVERTIME_INTERVAL_MS = 60 * MS.MINUTE;
export const OVERTIME_MAX_NUDGES = 6;

/** "Did you forget to end?" cap = min(2× target, 36h). */
export const FORGOT_ABSOLUTE_CAP_MS = 36 * MS.HOUR;
export function forgotAtOffset(targetMs: number): number {
  return Math.min(2 * targetMs, FORGOT_ABSOLUTE_CAP_MS);
}

/** Rolling window of planned daily reminders synced to the backend (plan §Notifications). */
export const ROLLING_WINDOW_DAYS = 7;

/** Render heartbeat — re-derive at most once per second for display only. */
export const HEARTBEAT_MS = 1 * MS.SECOND;

/** Local-storage / schema version for export envelopes + Dexie migrations. */
export const SCHEMA_VERSION = 1;
export const EXPORT_FORMAT = "fasted.backup" as const;
