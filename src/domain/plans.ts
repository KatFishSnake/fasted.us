/** Preset fasting plans (plan decision 4). Custom is user-defined hours. */
import type { PlanKind } from "./types";
import { MS } from "./constants";

export interface PresetPlan {
  kind: Exclude<PlanKind, "custom">;
  label: string;
  fastingHours: number;
  eatingHours: number;
}

export const PRESET_PLANS: readonly PresetPlan[] = [
  { kind: "16:8", label: "16:8", fastingHours: 16, eatingHours: 8 },
  { kind: "18:6", label: "18:6", fastingHours: 18, eatingHours: 6 },
  { kind: "20:4", label: "20:4", fastingHours: 20, eatingHours: 4 },
  { kind: "14:10", label: "14:10", fastingHours: 14, eatingHours: 10 },
] as const;

export const DEFAULT_PLAN_KIND: PlanKind = "16:8";

export function fastingMsForPreset(kind: Exclude<PlanKind, "custom">): number {
  const p = PRESET_PLANS.find((x) => x.kind === kind);
  return (p?.fastingHours ?? 16) * MS.HOUR;
}
