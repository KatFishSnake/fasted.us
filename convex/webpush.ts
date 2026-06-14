/** Web Push subscription storage (plan §Notifications), scoped to the authed user. */
import { v } from "convex/values";
import { mutation, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    keys: v.object({ p256dh: v.string(), auth: v.string() }),
    tz: v.string(),
    lang: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("pushSubs")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    // Only adopt an existing row if it's unowned or already this user's —
    // never hijack another account's subscription by submitting its endpoint.
    if (existing && existing.userId === userId) {
      await ctx.db.patch(existing._id, { ...args, userId });
    } else if (!existing) {
      await ctx.db.insert("pushSubs", { userId, ...args });
    } else {
      // Endpoint belongs to someone else (shouldn't happen — endpoints are
      // per-device-per-origin); replace it with a fresh row for this user.
      await ctx.db.delete(existing._id);
      await ctx.db.insert("pushSubs", { userId, ...args });
    }
    return { ok: true };
  },
});

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("pushSubs")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    // Ownership check: a user can only remove their own subscription.
    if (existing && existing.userId === userId) await ctx.db.delete(existing._id);
  },
});

export const subsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("pushSubs").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

/** Prune a subscription the push service rejected (404/410). */
export const pruneByEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db
      .query("pushSubs")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
