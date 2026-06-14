/**
 * Reminder scheduling — PURE (plan §Notifications/Scheduling).
 *
 * Two families:
 *  - Planned (from a daily scheduled local start): preStart(−30m), start, grace(+30m),
 *    materialised over a rolling 7-day window so recurring reminders are *designed*,
 *    not implied (codex #6).
 *  - Active (from a real startedAt): goal, overtime[k] (hourly, capped), forgot.
 *
 * DST disambiguation uses Temporal `disambiguation:'compatible'` (codex #7).
 * dedupKeys are stable so the backend can diff by key and never double-send.
 */
import { Temporal } from "temporal-polyfill";
import type { Fast, HHMM, Plan } from "../domain/types";
import {
  GRACE_AFTER_START_MS,
  OVERTIME_INTERVAL_MS,
  OVERTIME_MAX_NUDGES,
  PRE_START_LEAD_MS,
  ROLLING_WINDOW_DAYS,
  forgotAtOffset,
} from "../domain/constants";

export type ReminderKind =
  | "preStart"
  | "start"
  | "grace"
  | "goal"
  | "overtime"
  | "forgot";

export interface ReminderSpec {
  dedupKey: string;
  kind: ReminderKind;
  /** Absolute fire time, epoch ms. */
  fireAt: number;
  /** Sequence for repeated kinds (overtime). */
  seq?: number;
}

/** Stable dedup key: `${scope}:${kind}[:${seq}]`. */
export function dedupKey(scope: string, kind: ReminderKind, seq?: number): string {
  return seq == null ? `${scope}:${kind}` : `${scope}:${kind}:${seq}`;
}

/** Resolve the configured zone ("device" → the host's IANA zone). */
export function resolveZone(timeZone: "device" | string): string {
  if (timeZone && timeZone !== "device") return timeZone;
  return Temporal.Now.timeZoneId();
}

/** Resolve a local HH:MM on a civil date in a zone to an absolute instant. */
function localTimeToEpochMs(date: Temporal.PlainDate, hhmm: HHMM, zone: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const pdt = date.toPlainDateTime(Temporal.PlainTime.from({ hour: h ?? 0, minute: m ?? 0 }));
  // 'compatible' matches how phones/calendars resolve ambiguous wall-clock times at DST.
  return pdt.toZonedDateTime(zone, { disambiguation: "compatible" }).epochMilliseconds;
}

/** Planned reminders for a single civil-day start instant. */
function plannedForStart(scope: string, startAtMs: number): ReminderSpec[] {
  return [
    { dedupKey: dedupKey(scope, "preStart"), kind: "preStart", fireAt: startAtMs - PRE_START_LEAD_MS },
    { dedupKey: dedupKey(scope, "start"), kind: "start", fireAt: startAtMs },
    { dedupKey: dedupKey(scope, "grace"), kind: "grace", fireAt: startAtMs + GRACE_AFTER_START_MS },
  ];
}

/**
 * Rolling 7-day window of planned daily reminders for a plan with a scheduled start.
 * Only future fires are emitted; past ones are covered by on-open catch-up.
 */
export function computePlannedReminders(
  now: number,
  plan: Pick<Plan, "id" | "scheduledStartLocal">,
  timeZone: "device" | string,
  days: number = ROLLING_WINDOW_DAYS,
): ReminderSpec[] {
  if (!plan.scheduledStartLocal) return [];
  const zone = resolveZone(timeZone);
  const today = Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate();
  const out: ReminderSpec[] = [];
  for (let d = 0; d < days; d++) {
    const date = today.add({ days: d });
    const startAtMs = localTimeToEpochMs(date, plan.scheduledStartLocal, zone);
    const scope = `sched:${plan.id}:${date.toString()}`;
    for (const spec of plannedForStart(scope, startAtMs)) {
      if (spec.fireAt > now) out.push(spec);
    }
  }
  return out;
}

/** Active reminders derived from a real open fast. */
export function computeActiveReminders(fast: Pick<Fast, "id" | "startAt" | "targetMs">): ReminderSpec[] {
  const scope = fast.id;
  const goalAt = fast.startAt + fast.targetMs;
  const out: ReminderSpec[] = [
    { dedupKey: dedupKey(scope, "goal"), kind: "goal", fireAt: goalAt },
  ];
  for (let k = 1; k <= OVERTIME_MAX_NUDGES; k++) {
    out.push({
      dedupKey: dedupKey(scope, "overtime", k),
      kind: "overtime",
      fireAt: goalAt + k * OVERTIME_INTERVAL_MS,
      seq: k,
    });
  }
  out.push({
    dedupKey: dedupKey(scope, "forgot"),
    kind: "forgot",
    fireAt: fast.startAt + forgotAtOffset(fast.targetMs),
  });
  return out;
}
