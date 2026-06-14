"use client";
/**
 * Pushes the COMPLETE desired reminder set to Convex whenever the local fast /
 * plan / prefs change (plan §Delivery — client sends desired, server diffs by
 * dedupKey). Runs only when signed in. Planned reminders use the rolling window;
 * active reminders derive from the open fast. Prefs gate which kinds are sent.
 *
 * (Stale planned reminders that slip through are still suppressed at delivery by
 * the SW `shouldStillShow` guard, so this need not also issue explicit cancels.)
 */
import { useEffect, useMemo } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOpenFast, usePlans, useSettings } from "@/store/hooks";
import { SystemClock } from "@/domain/clock";
import { computeActiveReminders, computePlannedReminders, type ReminderKind } from "./schedule";

const KIND_PREF: Record<ReminderKind, keyof import("@/domain/types").ReminderPrefs> = {
  preStart: "preStart",
  start: "start",
  grace: "grace",
  goal: "goal",
  overtime: "overtime",
  forgot: "forgot",
};

export function RemindersSync() {
  const { isAuthenticated } = useConvexAuth();
  const openFast = useOpenFast();
  const plans = usePlans();
  const settings = useSettings();
  const syncReminders = useMutation(api.reminders.syncReminders);

  const desired = useMemo(() => {
    if (!settings?.reminderPrefs.enabled) return [];
    const now = SystemClock.now();
    const specs = openFast
      ? computeActiveReminders(openFast)
      : (() => {
          const plan = plans?.find((p) => p.id === settings.activePlanId);
          return plan ? computePlannedReminders(now, plan, settings.timeZone) : [];
        })();
    return specs
      .filter((s) => settings.reminderPrefs[KIND_PREF[s.kind]])
      .map((s) => ({ dedupKey: s.dedupKey, kind: s.kind, fireAt: s.fireAt }));
  }, [openFast, plans, settings]);

  useEffect(() => {
    if (!isAuthenticated || desired.length === 0) return;
    syncReminders({ desired }).catch(() => {});
  }, [isAuthenticated, desired, syncReminders]);

  // Register for push if a VAPID key is configured + permission already granted.
  useEffect(() => {
    if (!isAuthenticated || !settings?.reminderPrefs.enabled) return;
    import("@/store/convex").then(({ convexClient }) => {
      const client = convexClient();
      if (client) import("@/push/subscribe").then((m) => m.subscribeToPush(client)).catch(() => {});
    });
  }, [isAuthenticated, settings?.reminderPrefs.enabled]);

  return null;
}
