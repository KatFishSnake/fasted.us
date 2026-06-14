"use node";
/**
 * Primary reminder sender (plan §Delivery): a 1-minute cron sweep that sends
 * due, unsent reminders idempotently — fewer races than per-row scheduling.
 * Web Push first (best-effort under Doze), plus an opt-in Resend email backstop
 * (not Doze-throttled). Both deduped by the reminder's dedupKey.
 *
 * Runtime-gated: needs VAPID_* env (Web Push) and RESEND_API_KEY (email) set in
 * the Convex deployment, plus stored subscriptions. Wires up automatically once
 * those exist; until then it no-ops gracefully.
 */
import webpush from "web-push";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Backend-local copy (kept minimal + EN) to avoid bundling the client domain code.
const BODY: Record<string, { title: string; body: string; urgent: boolean }> = {
  preStart: { title: "Fasted", body: "Fast starts in 30 min", urgent: false },
  start: { title: "Fasted", body: "Time to start fasting", urgent: false },
  grace: { title: "Fasted", body: "Did you start your fast?", urgent: true },
  goal: { title: "Goal reached! 🎉", body: "You hit your fasting goal", urgent: true },
  overtime: { title: "Fasted", body: "Past your goal", urgent: false },
  forgot: { title: "Fasted", body: "Did you break your fast?", urgent: false },
};

function fastIdFromDedup(dedupKey: string): string | undefined {
  const scope = dedupKey.split(":")[0];
  return scope === "sched" ? undefined : scope;
}

export const sweep = internalAction({
  args: {},
  // Explicit return type breaks the self-referential `internal` inference cycle.
  handler: async (ctx): Promise<{ sent: number }> => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@fasted.us";
    const vapidReady = Boolean(publicKey && privateKey);
    if (vapidReady) webpush.setVapidDetails(subject, publicKey!, privateKey!);

    const now = Date.now();
    const dueReminders = await ctx.runQuery(internal.reminders.due, { now });

    for (const r of dueReminders) {
      const copy = BODY[r.kind] ?? { title: "Fasted", body: "Open Fasted", urgent: false };
      const payload = JSON.stringify({ v: 1, kind: r.kind, dedupKey: r.dedupKey, fastId: fastIdFromDedup(r.dedupKey) });

      // Web Push — to every subscription for this user.
      if (vapidReady) {
        const subs = await ctx.runQuery(internal.webpush.subsForUser, { userId: r.userId });
        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              payload,
              { urgency: copy.urgent ? "high" : "normal", topic: r.dedupKey.slice(0, 32), TTL: 3600 },
            );
          } catch (err: unknown) {
            const status = (err as { statusCode?: number })?.statusCode;
            if (status === 404 || status === 410) {
              await ctx.runMutation(internal.webpush.pruneByEndpoint, { endpoint: sub.endpoint });
            }
          }
        }
      }

      // Email backstop (Resend) for critical kinds when opted in.
      const apiKey = process.env.RESEND_API_KEY;
      const emailKinds = new Set(["preStart", "start", "goal", "forgot"]);
      if (apiKey && emailKinds.has(r.kind)) {
        const cx = await ctx.runQuery(internal.internal.userContext, { userId: r.userId });
        if (cx.email && cx.reminderPrefs?.enabled && cx.reminderPrefs?.emailBackstop) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: process.env.RESEND_FROM ?? "Fasted <reminders@fasted.us>",
                to: cx.email,
                subject: copy.title,
                text: `${copy.body}\n\nOpen Fasted: ${process.env.SITE_URL ?? "https://fasted.us"}`,
              }),
            });
          } catch {
            /* email is a backstop; never block the sweep */
          }
        }
      }

      await ctx.runMutation(internal.reminders.markSent, { id: r._id });
    }

    return { sent: dueReminders.length };
  },
});
