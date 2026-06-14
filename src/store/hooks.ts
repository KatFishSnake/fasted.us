"use client";
/**
 * Client hooks — Convex is the store (reactive across tabs + devices for free).
 * The 1 Hz interval is a render heartbeat only; deriveState recomputes exactly
 * on visibility/focus/pageshow/online wake.
 */
import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { SystemClock } from "@/domain/clock";
import { deriveState } from "@/domain/state";
import type { DerivedState, Fast, Plan, Settings } from "@/domain/types";
import { HEARTBEAT_MS } from "@/domain/constants";
import { fastFromDoc, planFromDoc, settingsFromDoc } from "@/data/convexMap";

export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/** Current clock — 1 Hz heartbeat + exact ticks on wake. */
export function useNow(): number {
  const [now, setNow] = useState(() => SystemClock.now());
  useEffect(() => {
    const tick = () => setNow(SystemClock.now());
    const id = setInterval(tick, HEARTBEAT_MS);
    const events = ["visibilitychange", "focus", "pageshow", "online"];
    events.forEach((e) => window.addEventListener(e, tick));
    return () => {
      clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, tick));
    };
  }, []);
  return now;
}

export function useSettings(): Settings | undefined {
  const doc = useQuery(api.settings.get);
  if (doc === undefined) return undefined; // still loading
  return settingsFromDoc(doc) ?? undefined;
}

export function usePlans(): Plan[] | undefined {
  const docs = useQuery(api.plans.list);
  return docs?.map(planFromDoc);
}

export function useHistory(): Fast[] | undefined {
  const docs = useQuery(api.fasts.history);
  return docs?.map(fastFromDoc);
}

export function useOpenFast(): Fast | null | undefined {
  const doc = useQuery(api.fasts.getOpen);
  if (doc === undefined) return undefined;
  return doc ? fastFromDoc(doc) : null;
}

/** Derived state of the open fast, recomputed on every heartbeat. */
export function useDerivedFast(): DerivedState {
  const now = useNow();
  const openFast = useOpenFast();
  const settings = useSettings();
  const markGoalAck = useMutation(api.fasts.markGoalAck);
  const state = deriveState(now, openFast ?? null, undefined, settings ?? null);

  useEffect(() => {
    if (state.goalCrossed && state.fastId) {
      markGoalAck({ fastId: state.fastId as never, at: now }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.goalCrossed, state.fastId]);

  return state;
}

export interface FastActions {
  start: (opts?: { startAt?: number }) => Promise<void>;
  end: (fastId: string, endAt?: number) => Promise<void>;
  editEnd: (fastId: string, startAt: number, endAt: number) => Promise<void>;
  abandon: (fastId: string) => Promise<void>;
}

export function useFastActions(): FastActions {
  const settings = useSettings();
  const plans = usePlans();
  const startFast = useMutation(api.fasts.start);
  const endFast = useMutation(api.fasts.end);
  const editFast = useMutation(api.fasts.edit);
  const abandonFast = useMutation(api.fasts.abandon);

  const start = useCallback(
    async (opts?: { startAt?: number }) => {
      const plan = plans?.find((p) => p.id === settings?.activePlanId) ?? plans?.[0];
      if (!plan) throw new Error("No active plan");
      await startFast({
        planId: plan.id,
        planKind: plan.kind,
        targetMs: plan.fastingMs,
        startAt: opts?.startAt,
        tz: settings?.timeZone && settings.timeZone !== "device"
          ? settings.timeZone
          : Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    },
    [plans, settings, startFast],
  );

  const end = useCallback(
    async (fastId: string, endAt?: number) => {
      await endFast({ fastId: fastId as never, endAt });
    },
    [endFast],
  );

  const editEnd = useCallback(
    async (fastId: string, startAt: number, endAt: number) => {
      await editFast({ fastId: fastId as never, startAt, endAt });
    },
    [editFast],
  );

  const abandon = useCallback(
    async (fastId: string) => {
      await abandonFast({ fastId: fastId as never });
    },
    [abandonFast],
  );

  return { start, end, editEnd, abandon };
}
