"use node";
/**
 * Primary reminder sender (plan §Delivery): a 1-minute cron sweep that sends
 * due, unsent reminders. Web Push (best-effort under Doze) + an opt-in Resend
 * email backstop (not Doze-throttled), deduped by the reminder's dedupKey.
 *
 * Safety (from /review):
 *  - `due` is bounded (take 200) so one sweep never loads the global backlog.
 *  - Each reminder is marked sent BEFORE sending (at-most-once): a mid-sweep
 *    crash/timeout can't trigger a duplicate-notification storm on the next run.
 *  - Each reminder is wrapped in try/catch so one failure doesn't abort the batch.
 *  - `topic` is a stable short hash of the dedupKey (no prefix-truncation collisions).
 *
 * Runtime-gated: needs VAPID_* env (Web Push) and RESEND_API_KEY (email) set in
 * the Convex deployment, plus stored subscriptions. No-ops gracefully otherwise.
 */
import webpush from "web-push";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

// Backend-local copy (kept minimal + EN) to avoid bundling the client domain code.
const BODY: Record<string, { title: string; body: string; urgent: boolean }> = {
  preStart: { title: "Fasted", body: "Fast starts in 30 min", urgent: false },
  start: { title: "Fasted", body: "Time to start fasting", urgent: false },
  grace: { title: "Fasted", body: "Did you start your fast?", urgent: true },
  goal: { title: "Goal reached! 🎉", body: "You hit your fasting goal", urgent: true },
  overtime: { title: "Fasted", body: "Past your goal", urgent: false },
  forgot: { title: "Fasted", body: "Did you break your fast?", urgent: false },
};

const EMAIL_KINDS = new Set(["preStart", "start", "goal", "forgot"]);

function fastIdFromDedup(dedupKey: string): string | undefined {
  const scope = dedupKey.split(":")[0];
  return scope === "sched" ? undefined : scope;
}

/** Stable short topic from a dedupKey — Web Push `topic` must be <=32 chars and
 *  collapse only TRULY-duplicate messages, so hash rather than prefix-truncate. */
function topicFor(dedupKey: string): string {
  let h = 2166136261;
  for (let i = 0; i < dedupKey.length; i++) {
    h ^= dedupKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return "t" + (h >>> 0).toString(36);
}

async function sendOne(ctx: ActionCtx, r: Doc<"reminders">, vapidReady: boolean): Promise<void> {
  const copy = BODY[r.kind] ?? { title: "Fasted", body: "Open Fasted", urgent: false };
  const payload = JSON.stringify({ v: 1, kind: r.kind, dedupKey: r.dedupKey, fastId: fastIdFromDedup(r.dedupKey) });

  if (vapidReady) {
    const subs = await ctx.runQuery(internal.webpush.subsForUser, { userId: r.userId });
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, {
          urgency: copy.urgent ? "high" : "normal",
          topic: topicFor(r.dedupKey),
          TTL: 3600,
        });
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
  if (apiKey && EMAIL_KINDS.has(r.kind)) {
    const cx = await ctx.runQuery(internal.internal.userContext, { userId: r.userId });
    if (cx.email && cx.reminderPrefs?.enabled && cx.reminderPrefs?.emailBackstop) {
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
    }
  }
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
    const dueReminders = await ctx.runQuery(internal.reminders.due, { now, limit: 200 });

    for (const r of dueReminders) {
      // Mark sent FIRST (at-most-once), then attempt delivery; one failure must
      // not abort the batch or cause a re-send storm on the next sweep.
      await ctx.runMutation(internal.reminders.markSent, { id: r._id });
      try {
        await sendOne(ctx, r, vapidReady);
      } catch {
        /* delivery is best-effort; never block the sweep */
      }
    }
    return { sent: dueReminders.length };
  },
});
