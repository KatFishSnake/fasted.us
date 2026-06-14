import { test, expect, describe } from "bun:test";
import { shouldStillShow } from "../src/notifications/guards";
import { deriveState } from "../src/domain/state";
import { MS } from "../src/domain/constants";
import type { Fast } from "../src/domain/types";

const T0 = 1_700_000_000_000;
const target = 16 * MS.HOUR;
const fast: Fast = {
  id: "f1",
  planId: "p1",
  planKindSnapshot: "16:8",
  targetMs: target,
  startAt: T0,
  endAt: null,
  status: "active",
  goalMet: null,
  tzAtStart: "UTC",
  updatedAt: T0,
  createdAt: T0,
};

describe("shouldStillShow", () => {
  test("planned reminders suppressed while a fast is active", () => {
    const active = deriveState(T0 + MS.HOUR, fast);
    expect(shouldStillShow("start", active)).toBe(false);
    expect(shouldStillShow("grace", active)).toBe(false);
  });

  test("planned reminders shown when idle", () => {
    const idle = deriveState(T0, null);
    expect(shouldStillShow("preStart", idle)).toBe(true);
    expect(shouldStillShow("start", idle)).toBe(true);
  });

  test("goal shown only once goal is met", () => {
    expect(shouldStillShow("goal", deriveState(T0 + MS.HOUR, fast))).toBe(false);
    expect(shouldStillShow("goal", deriveState(T0 + target, fast))).toBe(true);
  });

  test("overtime shown only in overtime", () => {
    expect(shouldStillShow("overtime", deriveState(T0 + target - MS.HOUR, fast))).toBe(false);
    expect(shouldStillShow("overtime", deriveState(T0 + target + MS.HOUR, { ...fast, goalAckAt: T0 + target }))).toBe(true);
  });

  test("no-state fallback shows all kinds (server is authoritative)", () => {
    // The cron only sends pending reminders and cancels on end/abandon, so a
    // received push is always one the server decided is still live.
    expect(shouldStillShow("preStart", null)).toBe(true);
    expect(shouldStillShow("start", null)).toBe(true);
    expect(shouldStillShow("grace", null)).toBe(true);
    expect(shouldStillShow("goal", null)).toBe(true);
    expect(shouldStillShow("overtime", null)).toBe(true);
    expect(shouldStillShow("forgot", null)).toBe(true);
  });
});
