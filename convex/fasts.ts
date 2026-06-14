/**
 * Fasts — user-scoped. Convex mutations are serialisable, so the one-open-fast
 * invariant is a simple "is there already an active fast?" check (no lock record
 * needed as there was with Dexie/multi-tab). No auto-start, ever (decision 5):
 * a fast exists only when the user explicitly starts it.
 */
import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireUser, optionalUser } from "./authz";
import type { Id } from "./_generated/dataModel";

const MAX_PLAUSIBLE_FAST_MS = 7 * 86_400_000;

/** Cancel all pending reminders scoped to a fast (dedupKey = `${fastId}:...`). */
async function cancelFastReminders(ctx: MutationCtx, userId: Id<"users">, fastId: string) {
  const rows = await ctx.db
    .query("reminders")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const prefix = `${fastId}:`;
  for (const r of rows) {
    if (r.status === "pending" && r.dedupKey.startsWith(prefix)) {
      await ctx.db.patch(r._id, { status: "cancelled" });
    }
  }
}

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
  // targetMs/planKind are NOT trusted from the client — they're derived from the
  // user's own plan server-side, so a crafted call can't store a bogus target.
  args: {
    planId: v.id("plans"),
    startAt: v.optional(v.number()),
    tz: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();
    const startAt = args.startAt ?? now;
    if (startAt > now) throw new Error("Start time can't be in the future.");
    if (now - startAt > MAX_PLAUSIBLE_FAST_MS) {
      throw new Error("Start time is implausibly far in the past.");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) throw new Error("Plan not found");
    if (plan.fastingMs <= 0) throw new Error("Plan has an invalid fasting window.");

    const open = await ctx.db
      .query("fasts")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .first();
    if (open) throw new Error("A fast is already running.");

    return await ctx.db.insert("fasts", {
      userId,
      planId: args.planId,
      planKindSnapshot: plan.kind,
      targetMs: plan.fastingMs,
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
    // The fast is over — cancel its goal/overtime/forgot reminders so the cron
    // sweep never sends a stale push for a fast the user already ended.
    await cancelFastReminders(ctx, userId, fastId);
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
    if (nextEnd != null && nextEnd <= nextStart) {
      throw new Error("End time must be after the start.");
      // Durations > 7d are allowed but flagged in the UI via suspectClock.
    }
    const goalMet = nextEnd != null ? nextEnd - nextStart >= fast.targetMs : fast.goalMet;
    await ctx.db.patch(fastId, {
      startAt: nextStart,
      endAt: nextEnd,
      goalMet,
      // If an edit pushes the goal back out of reach, drop the stale ack so the
      // goal-crossing flow can fire again should the times later qualify.
      goalAckAt: goalMet === false ? undefined : fast.goalAckAt,
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
    await cancelFastReminders(ctx, userId, fastId);
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
