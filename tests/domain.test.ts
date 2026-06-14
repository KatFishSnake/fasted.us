import { test, expect, describe } from "bun:test";
import { deriveState } from "../src/domain/state";
import { stageAt, nextStageAt } from "../src/domain/stages";
import { validateStart, validateEnd } from "../src/domain/validation";
import { MS, MAX_PLAUSIBLE_FAST_MS } from "../src/domain/constants";
import type { Fast } from "../src/domain/types";

const T0 = 1_700_000_000_000; // fixed epoch
const target = 16 * MS.HOUR;

function activeFast(over: Partial<Fast> = {}): Fast {
  return {
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
    ...over,
  };
}

describe("deriveState", () => {
  test("idle when no fast", () => {
    const s = deriveState(T0, null);
    expect(s.status).toBe("idle");
    expect(s.progress).toBe(0);
  });

  test("active mid-fast: remaining/elapsed/progress", () => {
    const s = deriveState(T0 + 8 * MS.HOUR, activeFast());
    expect(s.status).toBe("active");
    expect(s.elapsedMs).toBe(8 * MS.HOUR);
    expect(s.remainingMs).toBe(8 * MS.HOUR);
    expect(s.progress).toBeCloseTo(0.5, 5);
    expect(s.progressClamped).toBeCloseTo(0.5, 5);
    expect(s.overtimeMs).toBe(0);
  });

  test("goal crossing fires once, then overtime after ack", () => {
    const justCrossed = deriveState(T0 + target, activeFast());
    expect(justCrossed.goalMet).toBe(true);
    expect(justCrossed.goalCrossed).toBe(true);
    expect(justCrossed.status).toBe("goalReached");

    // After persisting goalAckAt, crossing no longer fires; status → overtime.
    const acked = deriveState(T0 + target + MS.MINUTE, activeFast({ goalAckAt: T0 + target }));
    expect(acked.goalCrossed).toBe(false);
    expect(acked.status).toBe("overtime");
    expect(acked.overtimeMs).toBe(MS.MINUTE);
  });

  test("goal crossing survives backgrounding across the boundary", () => {
    // App was closed before target; reopens well past it, never acked → still crosses.
    const s = deriveState(T0 + target + 3 * MS.HOUR, activeFast());
    expect(s.goalCrossed).toBe(true);
  });

  test("progress caps at 1 in overtime but progress (uncapped) exceeds 1", () => {
    const s = deriveState(T0 + target + 4 * MS.HOUR, activeFast({ goalAckAt: T0 + target }));
    expect(s.progress).toBeGreaterThan(1);
    expect(s.progressClamped).toBe(1);
  });

  test("clock running backwards clamps elapsed to 0 (never negative)", () => {
    const s = deriveState(T0 - MS.HOUR, activeFast());
    expect(s.elapsedMs).toBe(0);
    expect(s.remainingMs).toBe(target);
  });

  test("suspect clock when elapsed exceeds 7 days, never auto-completes", () => {
    const s = deriveState(T0 + MAX_PLAUSIBLE_FAST_MS + MS.HOUR, activeFast());
    expect(s.suspectClock).toBe(true);
    expect(s.status).not.toBe("completed");
  });

  test("completed fast derives frozen elapsed + goalMet", () => {
    const fast = activeFast({ status: "completed", endAt: T0 + target, goalMet: true });
    const s = deriveState(T0 + 100 * MS.DAY, fast); // now is irrelevant once completed
    expect(s.status).toBe("completed");
    expect(s.elapsedMs).toBe(target);
    expect(s.goalMet).toBe(true);
  });
});

describe("stages", () => {
  test("stageAt picks the last passed threshold", () => {
    expect(stageAt(0)?.key).toBe("anabolic");
    expect(stageAt(5 * MS.HOUR)?.key).toBe("catabolic");
    expect(stageAt(13 * MS.HOUR)?.key).toBe("fat-burning");
    expect(stageAt(17 * MS.HOUR)?.key).toBe("ketosis");
  });

  test("nextStageAt returns eta to the upcoming stage", () => {
    const next = nextStageAt(3 * MS.HOUR);
    expect(next?.stage.key).toBe("catabolic");
    expect(next?.etaMs).toBe(1 * MS.HOUR);
  });
});

describe("validation", () => {
  test("rejects future start", () => {
    expect(validateStart(T0 + MS.HOUR, T0).code).toBe("future-start");
    expect(validateStart(T0 - MS.HOUR, T0).ok).toBe(true);
  });

  test("rejects end before/at start and too-short", () => {
    expect(validateEnd(T0, T0).code).toBe("end-before-start");
    expect(validateEnd(T0, T0 + 30 * MS.SECOND).code).toBe("too-short");
    expect(validateEnd(T0, T0 + target).ok).toBe(true);
  });

  test("flags suspect clock for >7d fast (does not silently accept)", () => {
    expect(validateEnd(T0, T0 + MAX_PLAUSIBLE_FAST_MS + MS.HOUR).code).toBe("suspect-clock");
  });
});
