/**
 * SW-side guard: recompute deriveState from the shared Dexie DB and decide
 * whether a just-received push is still relevant (plan: three dedup layers +
 * SW fallback, codex #4/#11). Pure decision given (kind, derived-or-null).
 */
import type { ReminderKind } from "../scheduling/schedule";
import type { DerivedState } from "../domain/types";

/** When IDB is unreadable: SHOW the time-critical kinds, SUPPRESS the naggy ones. */
const FALLBACK_SHOW: Record<ReminderKind, boolean> = {
  preStart: true,
  start: true,
  grace: true,
  goal: true,
  overtime: false,
  forgot: false,
};

export function shouldStillShow(kind: ReminderKind, state: DerivedState | null): boolean {
  // IDB unreadable → kind-based fallback.
  if (state === null) return FALLBACK_SHOW[kind];

  switch (kind) {
    // Planned reminders only make sense when no fast is currently running.
    case "preStart":
    case "start":
    case "grace":
      return state.status === "idle";
    // Goal/overtime/forgot only make sense while a fast is open.
    case "goal":
      return state.status === "goalReached" || (state.status === "active" && state.goalMet);
    case "overtime":
      return state.overtimeMs > 0;
    case "forgot":
      return state.status !== "idle" && state.status !== "completed";
    default:
      return true;
  }
}
