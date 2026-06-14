/// <reference types="vite/client" />
/**
 * Backend auth-scoping tests (plan §Verification: "a user cannot read/mutate
 * another user's rows"). Uses convex-test with two simulated Convex Auth
 * identities. getAuthUserId reads the user id from `identity.subject`
 * (`<userId>|<sessionId>`), so we mint real users rows and impersonate them.
 */
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type Caller = { mutation: ReturnType<typeof convexTest>["mutation"] };

/** Seed presets and return the (always non-null) default plan id, typed. */
async function seedPlan(as: Caller): Promise<Id<"plans">> {
  const id = await as.mutation(api.plans.ensureSeeded);
  if (!id) throw new Error("ensureSeeded returned no default plan");
  return id as Id<"plans">;
}

// Vite 7 / Vitest 4 don't support the extglob `!(*.*.*)` form, so we list the
// runtime modules explicitly and exclude type defs + test files.
const modules = import.meta.glob(["./**/*.js", "./**/*.ts", "!./**/*.d.ts", "!./**/*.test.ts"]);

async function setup() {
  const t = convexTest(schema, modules);
  const userA = await t.run((ctx) => ctx.db.insert("users", {}));
  const userB = await t.run((ctx) => ctx.db.insert("users", {}));
  const asA = t.withIdentity({ subject: `${userA}|sessionA` });
  const asB = t.withIdentity({ subject: `${userB}|sessionB` });
  return { t, userA, userB, asA, asB };
}

describe("signed-out access", () => {
  test("reads return empty/null instead of throwing", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.plans.list)).toEqual([]);
    expect(await t.query(api.fasts.getOpen)).toBeNull();
    expect(await t.query(api.fasts.history)).toEqual([]);
    expect(await t.query(api.settings.get)).toBeNull();
  });

  test("mutations requiring a user are rejected", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.plans.ensureSeeded)).rejects.toThrow(/signed in/i);
    await expect(t.mutation(api.settings.save, { hasOnboarded: true })).rejects.toThrow(/signed in/i);
  });
});

describe("cross-user isolation", () => {
  test("a user never sees another user's plans", async () => {
    const { asA, asB } = await setup();
    await asA.mutation(api.plans.ensureSeeded);
    expect((await asA.query(api.plans.list)).length).toBeGreaterThan(0);
    expect(await asB.query(api.plans.list)).toEqual([]);
  });

  test("a user never sees another user's fasts or history", async () => {
    const { asA, asB } = await setup();
    const planId = await seedPlan(asA);
    await asA.mutation(api.fasts.start, { planId, tz: "UTC" });

    expect(await asA.query(api.fasts.getOpen)).not.toBeNull();
    expect(await asB.query(api.fasts.getOpen)).toBeNull();
    expect(await asB.query(api.fasts.history)).toEqual([]);
  });

  test("a user cannot end/edit/abandon another user's fast", async () => {
    const { asA, asB } = await setup();
    const planId = await seedPlan(asA);
    const fastId = await asA.mutation(api.fasts.start, { planId, tz: "UTC" });

    await expect(asB.mutation(api.fasts.end, { fastId })).rejects.toThrow(/not found/i);
    await expect(asB.mutation(api.fasts.edit, { fastId, endAt: Date.now() })).rejects.toThrow(/not found/i);
    await expect(asB.mutation(api.fasts.abandon, { fastId })).rejects.toThrow(/not found/i);

    // A's fast is untouched after B's failed attempts.
    expect(await asA.query(api.fasts.getOpen)).not.toBeNull();
  });

  test("a user cannot start a fast on another user's plan", async () => {
    const { asA, asB } = await setup();
    const planId = await seedPlan(asA);
    await expect(asB.mutation(api.fasts.start, { planId, tz: "UTC" })).rejects.toThrow(/not found/i);
  });

  test("settings are isolated per user", async () => {
    const { asA, asB } = await setup();
    await asA.mutation(api.settings.save, { hasOnboarded: true, timeZone: "America/New_York" });
    const a = await asA.query(api.settings.get);
    expect(a?.timeZone).toBe("America/New_York");
    expect(await asB.query(api.settings.get)).toBeNull();
  });
});

describe("one-open-fast invariant", () => {
  test("a second start while one is active is rejected", async () => {
    const { asA } = await setup();
    const planId = await seedPlan(asA);
    await asA.mutation(api.fasts.start, { planId, tz: "UTC" });
    await expect(asA.mutation(api.fasts.start, { planId, tz: "UTC" })).rejects.toThrow(/already running/i);
  });
});
