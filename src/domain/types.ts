/**
 * Core domain types. Instants are UTC epoch ms. IDs are ULID strings.
 * Entities carry `updatedAt` for last-writer-wins sync/merge.
 */

export type Ulid = string;
/** "HH:MM" 24h local wall-clock, e.g. "20:00". */
export type HHMM = string;

export type PlanKind = "16:8" | "18:6" | "20:4" | "14:10" | "custom";

export interface Plan {
  id: Ulid;
  kind: PlanKind;
  label: string;
  /** Fasting window length, ms. The eating window is the day's remainder. */
  fastingMs: number;
  /** Optional daily scheduled local start, drives planned reminders. */
  scheduledStartLocal?: HHMM;
  isCustom: boolean;
  updatedAt: number;
  createdAt: number;
}

export type FastStatus = "active" | "completed" | "abandoned";

export interface Fast {
  id: Ulid;
  planId: Ulid;
  /** Snapshot of the plan kind at start — labels survive plan edits. */
  planKindSnapshot: PlanKind;
  /** Goal duration frozen at start, ms. */
  targetMs: number;
  startAt: number;
  endAt: number | null;
  status: FastStatus;
  /** Whether the goal was met, frozen at end. null while open. */
  goalMet: boolean | null;
  /** When the goal-crossing celebration was first observed + persisted. */
  goalAckAt?: number;
  /** IANA zone (or "device") captured at start, for stable labels. */
  tzAtStart: string;
  updatedAt: number;
  createdAt: number;
}

export interface ReminderPrefs {
  /** Master switch for any reminder scheduling. */
  enabled: boolean;
  preStart: boolean;
  start: boolean;
  grace: boolean;
  goal: boolean;
  overtime: boolean;
  forgot: boolean;
  /** Opt-in email backstop (Resend) — off by default; not Doze-throttled. */
  emailBackstop: boolean;
}

export interface Settings {
  /** Singleton row. */
  id: "settings";
  activePlanId: Ulid | null;
  /** "device" follows the OS zone; an IANA string pins it. */
  timeZone: "device" | string;
  reminderPrefs: ReminderPrefs;
  hasOnboarded: boolean;
  units?: "metric" | "imperial";
  updatedAt: number;
  createdAt: number;
}

/** Derived lifecycle status — never stored; computed from (facts, now). */
export type DerivedStatus =
  | "idle"
  | "scheduled"
  | "active"
  | "goalReached"
  | "overtime"
  | "completed";

export interface StageInfo {
  key: string;
  label: string;
  /** Hours into the fast this stage begins. */
  atHours: number;
}

export interface DerivedState {
  status: DerivedStatus;
  fastId: Ulid | null;
  startAt: number | null;
  targetMs: number;
  endAt: number | null;
  elapsedMs: number;
  remainingMs: number;
  overtimeMs: number;
  /** Uncapped fraction elapsed/target (can exceed 1). */
  progress: number;
  /** Clamped to [0,1] for the ring fill. */
  progressClamped: number;
  goalMet: boolean;
  /** True the instant elapsed first crosses target (crossing-based). */
  goalCrossed: boolean;
  currentStage: StageInfo | null;
  nextMilestone: { stage: StageInfo; etaMs: number } | null;
  /** Elapsed exceeds MAX_PLAUSIBLE_FAST_MS → likely a clock change. */
  suspectClock: boolean;
}
