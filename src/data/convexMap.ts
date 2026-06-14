/** Map Convex documents → pure domain types consumed by deriveState + UI. */
import type { Doc } from "@convex/_generated/dataModel";
import type { Fast, FastStatus, Plan, PlanKind, Settings } from "@/domain/types";

export function fastFromDoc(d: Doc<"fasts">): Fast {
  return {
    id: d._id,
    planId: d.planId,
    planKindSnapshot: d.planKindSnapshot as PlanKind,
    targetMs: d.targetMs,
    startAt: d.startAt,
    endAt: d.endAt,
    status: d.status as FastStatus,
    goalMet: d.goalMet,
    goalAckAt: d.goalAckAt,
    tzAtStart: d.tzAtStart,
    updatedAt: d.updatedAt,
    createdAt: d.createdAt,
  };
}

export function planFromDoc(d: Doc<"plans">): Plan {
  return {
    id: d._id,
    kind: d.kind as PlanKind,
    label: d.label,
    fastingMs: d.fastingMs,
    scheduledStartLocal: d.scheduledStartLocal,
    isCustom: d.isCustom,
    updatedAt: d.updatedAt,
    createdAt: d.createdAt,
  };
}

export function settingsFromDoc(d: Doc<"appSettings"> | null): Settings | null {
  if (!d) return null;
  return {
    id: "settings",
    activePlanId: d.activePlanId,
    timeZone: d.timeZone,
    reminderPrefs: d.reminderPrefs,
    hasOnboarded: d.hasOnboarded,
    updatedAt: d.updatedAt,
    createdAt: d._creationTime,
  };
}
