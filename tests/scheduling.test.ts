import { test, expect, describe } from "bun:test";
import {
  computeActiveReminders,
  computePlannedReminders,
  dedupKey,
} from "../src/scheduling/schedule";
import { MS, OVERTIME_MAX_NUDGES } from "../src/domain/constants";

const T0 = Date.UTC(2024, 5, 1, 0, 0, 0); // 2024-06-01 UTC
const target = 16 * MS.HOUR;

describe("active reminders", () => {
  const specs = computeActiveReminders({ id: "f1", startAt: T0, targetMs: target });

  test("goal fires at startAt+target", () => {
    const goal = specs.find((s) => s.kind === "goal")!;
    expect(goal.fireAt).toBe(T0 + target);
    expect(goal.dedupKey).toBe("f1:goal");
  });

  test("overtime nudges are hourly and capped", () => {
    const ot = specs.filter((s) => s.kind === "overtime");
    expect(ot.length).toBe(OVERTIME_MAX_NUDGES);
    expect(ot[0]!.fireAt).toBe(T0 + target + MS.HOUR);
    expect(ot[0]!.dedupKey).toBe("f1:overtime:1");
    expect(ot.at(-1)!.fireAt).toBe(T0 + target + OVERTIME_MAX_NUDGES * MS.HOUR);
  });

  test("forgot = min(2×target, 36h) after start", () => {
    const forgot = specs.find((s) => s.kind === "forgot")!;
    expect(forgot.fireAt).toBe(T0 + 2 * target); // 32h < 36h cap
  });

  test("dedupKeys are stable + unique", () => {
    const keys = specs.map((s) => s.dedupKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("planned reminders (rolling window, DST-safe)", () => {
  test("emits preStart/start/grace per future day, only in the future", () => {
    const now = Date.UTC(2024, 5, 1, 6, 0, 0); // 06:00, before a 20:00 start
    const specs = computePlannedReminders(
      now,
      { id: "p1", scheduledStartLocal: "20:00" },
      "UTC",
      7,
    );
    const days = new Set(specs.map((s) => s.dedupKey.split(":")[2]));
    // 7-day window, all three kinds each future day.
    expect(specs.every((s) => s.fireAt > now)).toBe(true);
    expect(days.size).toBeGreaterThanOrEqual(6);
    expect(specs.some((s) => s.kind === "preStart")).toBe(true);
    expect(specs.some((s) => s.kind === "grace")).toBe(true);
  });

  test("spring-forward day: 02:30 start resolves without throwing (disambiguation:compatible)", () => {
    // US spring-forward 2024-03-10; 02:30 local does not exist in America/New_York.
    const now = Date.UTC(2024, 2, 10, 0, 0, 0);
    const specs = computePlannedReminders(
      now,
      { id: "p1", scheduledStartLocal: "02:30" },
      "America/New_York",
      2,
    );
    const start = specs.find((s) => s.kind === "start");
    expect(start).toBeDefined();
    expect(Number.isFinite(start!.fireAt)).toBe(true);
  });

  test("no scheduled start → no planned reminders", () => {
    expect(computePlannedReminders(T0, { id: "p1" }, "UTC").length).toBe(0);
  });
});

test("dedupKey format", () => {
  expect(dedupKey("f1", "goal")).toBe("f1:goal");
  expect(dedupKey("f1", "overtime", 3)).toBe("f1:overtime:3");
});
