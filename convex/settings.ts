/** Settings singleton — user-scoped. Convex is the store. */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, optionalUser } from "./authz";

const DEFAULT_PREFS = {
  enabled: true,
  preStart: true,
  start: true,
  grace: true,
  goal: true,
  overtime: true,
  forgot: true,
  emailBackstop: false,
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUser(ctx);
    if (!userId) return null;
    return await ctx.db.query("appSettings").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
  },
});

export const save = mutation({
  args: {
    activePlanId: v.optional(v.union(v.string(), v.null())),
    timeZone: v.optional(v.string()),
    reminderPrefs: v.optional(v.any()),
    hasOnboarded: v.optional(v.boolean()),
  },
  handler: async (ctx, patch) => {
    const userId = await requireUser(ctx);
    const now = Date.now();
    const existing = await ctx.db.query("appSettings").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...patch, updatedAt: now });
      return;
    }
    await ctx.db.insert("appSettings", {
      userId,
      activePlanId: patch.activePlanId ?? null,
      timeZone: patch.timeZone ?? "device",
      reminderPrefs: patch.reminderPrefs ?? DEFAULT_PREFS,
      hasOnboarded: patch.hasOnboarded ?? false,
      updatedAt: now,
    });
  },
});
