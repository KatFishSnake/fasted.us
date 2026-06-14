/** Notification copy (EN, centralized for later i18n) — plan §Reminder table. */
import type { ReminderKind } from "../scheduling/schedule";

export interface NotifCopy {
  title: string;
  body: string;
  /** Best-effort action buttons (progressive enhancement; tap-to-open guaranteed). */
  actions: { action: string; title: string }[];
  /** High urgency for time-critical kinds. */
  urgent: boolean;
}

export const NOTIF_COPY: Record<ReminderKind, NotifCopy> = {
  preStart: {
    title: "Fasted",
    body: "Fast starts in 30 min",
    actions: [
      { action: "start", title: "Start now" },
      { action: "snooze15", title: "Snooze 15m" },
    ],
    urgent: false,
  },
  start: {
    title: "Fasted",
    body: "Time to start fasting",
    actions: [
      { action: "start", title: "Start fast" },
      { action: "snooze15", title: "Snooze 15m" },
    ],
    urgent: false,
  },
  grace: {
    title: "Fasted",
    body: "Did you start your fast?",
    actions: [
      { action: "start", title: "Start now" },
      { action: "already", title: "I already started" },
      { action: "skip", title: "Skip today" },
    ],
    urgent: true,
  },
  goal: {
    title: "Goal reached! 🎉",
    body: "You hit your fasting goal",
    actions: [
      { action: "end", title: "End fast" },
      { action: "keep", title: "Keep going" },
    ],
    urgent: true,
  },
  overtime: {
    title: "Fasted",
    body: "Past your goal",
    actions: [
      { action: "end", title: "End fast" },
      { action: "snooze2h", title: "Snooze 2h" },
    ],
    urgent: false,
  },
  forgot: {
    title: "Fasted",
    body: "Did you break your fast?",
    actions: [{ action: "end", title: "End now" }],
    urgent: false,
  },
};

/** Generic fallback body when the SW is older than the payload version. */
export const GENERIC_BODY = "Open Fasted to see your fast";
