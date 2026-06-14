/**
 * deriveState — THE single canonical derivation (plan §Core Architectural Principle).
 * Pure: no Date.now() inside. State is a function of stored timestamps + injected now.
 * Shared verbatim by the window app and the service worker.
 */
import type { DerivedState, Fast, Plan, Settings, StageInfo } from "./types";
import { MAX_PLAUSIBLE_FAST_MS } from "./constants";
import { STAGES, stageAt, nextStageAt } from "./stages";

const IDLE: DerivedState = {
  status: "idle",
  fastId: null,
  startAt: null,
  targetMs: 0,
  endAt: null,
  elapsedMs: 0,
  remainingMs: 0,
  overtimeMs: 0,
  progress: 0,
  progressClamped: 0,
  goalMet: false,
  goalCrossed: false,
  currentStage: null,
  nextMilestone: null,
  suspectClock: false,
};

export function deriveState(
  now: number,
  fast: Fast | null | undefined,
  _plan?: Plan | null,
  _settings?: Settings | null,
  stages: readonly StageInfo[] = STAGES,
): DerivedState {
  if (!fast || fast.status === "abandoned") return IDLE;

  const targetMs = fast.targetMs;

  if (fast.status === "completed" && fast.endAt != null) {
    const elapsedMs = Math.max(0, fast.endAt - fast.startAt);
    const overtimeMs = Math.max(0, elapsedMs - targetMs);
    const progress = targetMs > 0 ? elapsedMs / targetMs : 0;
    return {
      status: "completed",
      fastId: fast.id,
      startAt: fast.startAt,
      targetMs,
      endAt: fast.endAt,
      elapsedMs,
      remainingMs: 0,
      overtimeMs,
      progress,
      progressClamped: Math.min(1, Math.max(0, progress)),
      goalMet: fast.goalMet ?? elapsedMs >= targetMs,
      goalCrossed: false,
      currentStage: stageAt(elapsedMs, stages),
      nextMilestone: null,
      suspectClock: elapsedMs > MAX_PLAUSIBLE_FAST_MS,
    };
  }

  // Active fast. Clamp elapsed ≥ 0 (clock-change defense, codex #8).
  const elapsedMs = Math.max(0, now - fast.startAt);
  const suspectClock = elapsedMs > MAX_PLAUSIBLE_FAST_MS;
  const remainingMs = Math.max(0, targetMs - elapsedMs);
  const overtimeMs = Math.max(0, elapsedMs - targetMs);
  const progress = targetMs > 0 ? elapsedMs / targetMs : 0;
  const goalMet = elapsedMs >= targetMs;
  // Crossing-based: true once we first observe elapsed≥target before it's acked.
  const goalCrossed = goalMet && fast.goalAckAt == null;

  const status: DerivedState["status"] = !goalMet
    ? "active"
    : fast.goalAckAt == null
      ? "goalReached"
      : "overtime";

  return {
    status,
    fastId: fast.id,
    startAt: fast.startAt,
    targetMs,
    // Projected end while open ("ends 8:00 PM").
    endAt: fast.startAt + targetMs,
    elapsedMs,
    remainingMs,
    overtimeMs,
    progress,
    progressClamped: Math.min(1, Math.max(0, progress)),
    goalMet,
    goalCrossed,
    currentStage: stageAt(elapsedMs, stages),
    nextMilestone: nextStageAt(elapsedMs, stages),
    suspectClock,
  };
}
