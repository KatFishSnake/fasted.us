/** Plans — user-scoped (plan decision 4). Convex is the store. */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, optionalUser } from "./authz";

const PRESETS = [
  { kind: "16:8", label: "16:8", fastingHours: 16 },
  { kind: "18:6", label: "18:6", fastingHours: 18 },
  { kind: "20:4", label: "20:4", fastingHours: 20 },
  { kind: "14:10", label: "14:10", fastingHours: 14 },
];
const HOUR = 3_600_000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUser(ctx);
    if (!userId) return [];
    return await ctx.db.query("plans").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

/** Seed preset plans on first sign-in (idempotent). Returns the default plan id. */
export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db.query("plans").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    if (existing.length > 0) {
      return existing.find((p) => p.kind === "16:8")?._id ?? existing[0]!._id;
    }
    const now = Date.now();
    let defaultId: string | null = null;
    for (const p of PRESETS) {
      const id = await ctx.db.insert("plans", {
        userId,
        kind: p.kind,
        label: p.label,
        fastingMs: p.fastingHours * HOUR,
        isCustom: false,
        updatedAt: now,
        createdAt: now,
      });
      if (p.kind === "16:8") defaultId = id;
    }
    return defaultId;
  },
});

/** Set the daily scheduled start (local HH:MM) on a plan. */
export const setScheduledStart = mutation({
  args: { planId: v.id("plans"), scheduledStartLocal: v.optional(v.string()) },
  handler: async (ctx, { planId, scheduledStartLocal }) => {
    const userId = await requireUser(ctx);
    const plan = await ctx.db.get(planId);
    if (!plan || plan.userId !== userId) throw new Error("Plan not found");
    await ctx.db.patch(planId, { scheduledStartLocal, updatedAt: Date.now() });
  },
});

/** Create or update the user's single custom plan. Returns its id. */
export const upsertCustom = mutation({
  args: { label: v.string(), fastingMs: v.number() },
  handler: async (ctx, { label, fastingMs }) => {
    const userId = await requireUser(ctx);
    if (fastingMs <= 0 || fastingMs >= 24 * HOUR) throw new Error("Custom window must be 1–23h");
    const now = Date.now();
    const existing = (
      await ctx.db.query("plans").withIndex("by_user", (q) => q.eq("userId", userId)).collect()
    ).find((p) => p.isCustom);
    if (existing) {
      await ctx.db.patch(existing._id, { label, fastingMs, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("plans", {
      userId,
      kind: "custom",
      label,
      fastingMs,
      isCustom: true,
      updatedAt: now,
      createdAt: now,
    });
  },
});
