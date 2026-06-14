/**
 * Reminder table sync (plan §Delivery): the client sends the COMPLETE desired
 * set per scope; the server diffs by dedupKey — inserts new, updates changed
 * fireAt, cancels ones no longer desired. Idempotent. Scoped to the authed user.
 */
import { v } from "convex/values";
import { mutation, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const syncReminders = mutation({
  args: {
    desired: v.array(v.object({ dedupKey: v.string(), kind: v.string(), fireAt: v.number() })),
    /** dedupKeys to cancel (e.g. start-early cancels pre/start/grace). */
    cancel: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { desired, cancel }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    for (const r of desired) {
      const existing = await ctx.db
        .query("reminders")
        .withIndex("by_user_dedup", (q) => q.eq("userId", userId).eq("dedupKey", r.dedupKey))
        .unique();
      if (!existing) {
        await ctx.db.insert("reminders", { userId, ...r, status: "pending" });
      } else if (existing.fireAt !== r.fireAt && existing.status === "pending") {
        await ctx.db.patch(existing._id, { fireAt: r.fireAt });
      }
    }

    for (const key of cancel ?? []) {
      const existing = await ctx.db
        .query("reminders")
        .withIndex("by_user_dedup", (q) => q.eq("userId", userId).eq("dedupKey", key))
        .unique();
      if (existing && existing.status === "pending") await ctx.db.patch(existing._id, { status: "cancelled" });
    }

    return { ok: true };
  },
});

/** Due, unsent reminders — read by the cron sweep. Bounded so one sweep never
 *  loads the entire global backlog (which would blow the action time limit after
 *  an outage); the next minute drains the rest. */
export const due = internalQuery({
  args: { now: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, { now, limit }) => {
    return await ctx.db
      .query("reminders")
      .withIndex("by_status_fire", (q) => q.eq("status", "pending").lte("fireAt", now))
      .take(limit ?? 200);
  },
});

export const markSent = internalMutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "sent" });
  },
});
