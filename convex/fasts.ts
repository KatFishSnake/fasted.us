/**
 * Fasts — user-scoped. Convex mutations are serialisable, so the one-open-fast
 * invariant is a simple "is there already an active fast?" check (no lock record
 * needed as there was with Dexie/multi-tab). No auto-start, ever (decision 5):
 * a fast exists only when the user explicitly starts it.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, optionalUser } from "./authz";

const MAX_PLAUSIBLE_FAST_MS = 7 * 86_400_000;

export const getOpen = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUser(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("fasts")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .first();
  },
});

export const history = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUser(ctx);
    if (!userId) return [];
    const all = await ctx.db
      .query("fasts")
      .withIndex("by_user_start", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return all.filter((f) => f.status !== "active");
  },
});

export const start = mutation({
  args: {
    planId: v.string(),
    planKind: v.string(),
    targetMs: v.number(),
    startAt: v.optional(v.number()),
    tz: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();
    const startAt = args.startAt ?? now;
    if (startAt > now) throw new Error("Start time can't be in the future.");

    const open = await ctx.db
      .query("fasts")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .first();
    if (open) throw new Error("A fast is already running.");

    return await ctx.db.insert("fasts", {
      userId,
      planId: args.planId,
      planKindSnapshot: args.planKind,
      targetMs: args.targetMs,
      startAt,
      endAt: null,
      status: "active",
      goalMet: null,
      tzAtStart: args.tz,
      updatedAt: now,
      createdAt: now,
    });
  },
});

export const end = mutation({
  args: { fastId: v.id("fasts"), endAt: v.optional(v.number()) },
  handler: async (ctx, { fastId, endAt }) => {
    const userId = await requireUser(ctx);
    const fast = await ctx.db.get(fastId);
    if (!fast || fast.userId !== userId) throw new Error("Fast not found");
    const now = Date.now();
    const finalEnd = endAt ?? now;
    if (finalEnd <= fast.startAt) throw new Error("End time must be after the start.");
    // No MIN_FAST_MS floor here: ending a fast you actually started is always
    // valid (even if brief). The too-short guard applies to manual end-time
    // *edits* (mis-tap protection), enforced client-side in the edit sheet.
    const duration = finalEnd - fast.startAt;
    await ctx.db.patch(fastId, {
      endAt: finalEnd,
      status: "completed",
      goalMet: duration >= fast.targetMs,
      updatedAt: now,
    });
  },
});

export const edit = mutation({
  args: { fastId: v.id("fasts"), startAt: v.optional(v.number()), endAt: v.optional(v.number()) },
  handler: async (ctx, { fastId, startAt, endAt }) => {
    const userId = await requireUser(ctx);
    const fast = await ctx.db.get(fastId);
    if (!fast || fast.userId !== userId) throw new Error("Fast not found");
    const nextStart = startAt ?? fast.startAt;
    const nextEnd = endAt !== undefined ? endAt : fast.endAt;
    if (nextEnd != null) {
      if (nextEnd <= nextStart) throw new Error("End time must be after the start.");
      const duration = nextEnd - nextStart;
      if (duration > MAX_PLAUSIBLE_FAST_MS) {
        // Allowed but flagged in the UI via suspectClock — don't hard-reject.
      }
    }
    await ctx.db.patch(fastId, {
      startAt: nextStart,
      endAt: nextEnd,
      goalMet: nextEnd != null ? nextEnd - nextStart >= fast.targetMs : fast.goalMet,
      updatedAt: Date.now(),
    });
  },
});

export const abandon = mutation({
  args: { fastId: v.id("fasts") },
  handler: async (ctx, { fastId }) => {
    const userId = await requireUser(ctx);
    const fast = await ctx.db.get(fastId);
    if (!fast || fast.userId !== userId) throw new Error("Fast not found");
    await ctx.db.patch(fastId, { status: "abandoned", updatedAt: Date.now() });
  },
});

export const markGoalAck = mutation({
  args: { fastId: v.id("fasts"), at: v.number() },
  handler: async (ctx, { fastId, at }) => {
    const userId = await requireUser(ctx);
    const fast = await ctx.db.get(fastId);
    if (!fast || fast.userId !== userId || fast.goalAckAt != null) return;
    await ctx.db.patch(fastId, { goalAckAt: at, updatedAt: Date.now() });
  },
});
