/**
 * Convex schema — Convex is the single source of truth (no local Dexie).
 * Every row is scoped to the authed user (Convex Auth) via `userId`.
 * `authTables` supplies the `users` table + auth bookkeeping.
 */
import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  plans: defineTable({
    userId: v.id("users"),
    kind: v.string(),
    label: v.string(),
    fastingMs: v.number(),
    scheduledStartLocal: v.optional(v.string()),
    isCustom: v.boolean(),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  fasts: defineTable({
    userId: v.id("users"),
    planId: v.string(),
    planKindSnapshot: v.string(),
    targetMs: v.number(),
    startAt: v.number(),
    endAt: v.union(v.number(), v.null()),
    status: v.string(), // active | completed | abandoned
    goalMet: v.union(v.boolean(), v.null()),
    goalAckAt: v.optional(v.number()),
    tzAtStart: v.string(),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_start", ["userId", "startAt"]),

  appSettings: defineTable({
    userId: v.id("users"),
    activePlanId: v.union(v.string(), v.null()),
    timeZone: v.string(),
    reminderPrefs: v.any(),
    hasOnboarded: v.boolean(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  pushSubs: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    keys: v.object({ p256dh: v.string(), auth: v.string() }),
    tz: v.string(),
    lang: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  reminders: defineTable({
    userId: v.id("users"),
    dedupKey: v.string(),
    kind: v.string(),
    fireAt: v.number(),
    status: v.string(), // pending | sent | cancelled
  })
    .index("by_user_dedup", ["userId", "dedupKey"])
    .index("by_status_fire", ["status", "fireAt"])
    .index("by_user", ["userId"]),
});
