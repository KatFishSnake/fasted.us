/**
 * Fasting stages — data-driven, derived-only (plan §Stages).
 * Angles on the ring come from each stage's `atHours` vs the plan target.
 */
import type { StageInfo } from "./types";
import { MS } from "./constants";

export const STAGES: readonly StageInfo[] = [
  { key: "anabolic", label: "Anabolic", atHours: 0 },
  { key: "catabolic", label: "Catabolic", atHours: 4 },
  { key: "fat-burning", label: "Fat burning", atHours: 12 },
  { key: "ketosis", label: "Ketosis", atHours: 16 },
  { key: "autophagy", label: "Autophagy", atHours: 18 },
  { key: "growth-hormone", label: "Growth hormone", atHours: 18 },
  { key: "deep-ketosis", label: "Deep ketosis", atHours: 24 },
] as const;

/** The stage active at `elapsedMs` (the last stage whose threshold has passed). */
export function stageAt(elapsedMs: number, stages: readonly StageInfo[] = STAGES): StageInfo | null {
  let current: StageInfo | null = null;
  for (const s of stages) {
    if (elapsedMs >= s.atHours * MS.HOUR) current = s;
    else break;
  }
  return current;
}

/** The next stage and ms until it begins, or null past the last stage. */
export function nextStageAt(
  elapsedMs: number,
  stages: readonly StageInfo[] = STAGES,
): { stage: StageInfo; etaMs: number } | null {
  for (const s of stages) {
    const atMs = s.atHours * MS.HOUR;
    if (elapsedMs < atMs) return { stage: s, etaMs: atMs - elapsedMs };
  }
  return null;
}
