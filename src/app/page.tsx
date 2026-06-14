"use client";
/** Timer home (plan §UI: Post-cut Home composition). */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FastRing } from "@/components/ring/FastRing";
import { RingSkeleton } from "@/components/ring/RingSkeleton";
import { PlanPill } from "@/components/plan/PlanPill";
import { PlansSheet } from "@/components/plan/PlansSheet";
import { StartSheet } from "@/components/fast/StartSheet";
import { EndSheet } from "@/components/fast/EndSheet";
import { TabBar } from "@/components/nav/TabBar";
import { Button } from "@/components/ui/Button";
import { SuspectClockBanner } from "@/components/fast/SuspectClockBanner";
import {
  useMounted,
  useReducedMotion,
  useDerivedFast,
  useSettings,
  usePlans,
  useHistory,
  useFastActions,
} from "@/store/hooks";
import { formatHMS, formatDuration, formatClock, formatEta } from "@/lib/format";
import { celebrate } from "@/lib/celebrate";

export default function TimerPage() {
  const mounted = useMounted();
  const router = useRouter();
  const reduced = useReducedMotion();
  const state = useDerivedFast();
  const settings = useSettings();
  const plans = usePlans();
  const history = useHistory();
  const { start, end } = useFastActions();

  const [showRemaining, setShowRemaining] = useState(true);
  const [plansOpen, setPlansOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // Onboarding gate.
  useEffect(() => {
    if (mounted && settings && !settings.hasOnboarded) router.replace("/onboarding");
  }, [mounted, settings, router]);

  // Goal celebration (crossing-based), reduced-motion aware.
  useEffect(() => {
    if (state.goalCrossed) celebrate(reduced);
  }, [state.goalCrossed, reduced]);

  // Fall back to the first real plan (not a hardcoded label) if activePlanId is
  // stale/missing — start() uses the same fallback, so the pill never lies.
  const activePlan = plans?.find((p) => p.id === settings?.activePlanId) ?? plans?.[0];
  const planLabel = activePlan?.label ?? "—";
  const isActive = state.status !== "idle" && state.status !== "completed";

  const lastCompleted = history?.find((f) => f.status === "completed");

  if (!mounted || !settings) {
    return (
      <main className="flex min-h-dvh flex-col items-center px-5 pt-safe">
        <div className="mt-6 h-10 w-40 animate-pulse rounded-full bg-green-100" />
        <div className="mt-10">
          <RingSkeleton />
        </div>
        <TabBar />
      </main>
    );
  }

  // Center display
  const centerValue = isActive
    ? showRemaining
      ? formatHMS(state.remainingMs)
      : formatHMS(state.elapsedMs)
    : null;

  const ariaLabel = isActive
    ? `${planLabel} fast, ${formatDuration(state.elapsedMs)} elapsed, ${formatDuration(state.remainingMs)} remaining`
    : `No active fast. Plan ${planLabel}. Ready to start.`;

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pt-safe">
      <div className="mt-5">
        <PlanPill label={planLabel} onEdit={() => setPlansOpen(true)} />
      </div>

      {state.suspectClock && <SuspectClockBanner fastId={state.fastId} />}

      <div className="mt-8">
        <FastRing
          state={state}
          reducedMotion={reduced}
          ariaLabel={ariaLabel}
          onCenterTap={() => isActive && setShowRemaining((v) => !v)}
        >
          {isActive ? (
            <>
              <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                {state.overtimeMs > 0 ? "Overtime" : showRemaining ? "Remaining" : "Elapsed"}
              </span>
              <span className="tabular text-[2.6rem] font-bold leading-tight text-ink">{centerValue}</span>
              <span className="text-xs text-ink-faint">tap to toggle</span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold text-ink">Ready to fast</span>
              <span className="mt-1 text-sm text-ink-faint">{planLabel}</span>
            </>
          )}
        </FastRing>
      </div>

      {/* Stage / next-milestone line */}
      <div className="mt-6 min-h-[2.5rem] text-center">
        {isActive ? (
          <>
            <p className="font-medium text-ink">
              {state.currentStage?.label ?? "Fasting"}
              {state.endAt && <span className="text-ink-faint"> · ends {formatClock(state.endAt, settings.timeZone)}</span>}
            </p>
            {state.nextMilestone && (
              <p className="text-sm text-ink-faint">
                {state.nextMilestone.stage.label} in {formatEta(state.nextMilestone.etaMs)}
              </p>
            )}
          </>
        ) : (
          lastCompleted && (
            <p className="text-sm text-ink-faint">
              Last: {formatDuration((lastCompleted.endAt ?? 0) - lastCompleted.startAt)}{" "}
              {lastCompleted.goalMet ? "✓" : ""}
            </p>
          )
        )}
      </div>

      {/* Primary CTA */}
      <div className="mt-6 w-full max-w-[320px]">
        {isActive ? (
          <Button full variant={state.overtimeMs > 0 ? "primary" : "secondary"} onClick={() => setEndOpen(true)}>
            End fast
          </Button>
        ) : (
          <Button full onClick={() => setStartOpen(true)}>
            Start fast
          </Button>
        )}
      </div>

      <PlansSheet
        open={plansOpen}
        onOpenChange={setPlansOpen}
        plans={plans ?? []}
        activePlanId={settings.activePlanId}
      />
      <StartSheet open={startOpen} onOpenChange={setStartOpen} onStart={start} />
      <EndSheet
        open={endOpen}
        onOpenChange={setEndOpen}
        state={state}
        onEnd={(endAt) => end(state.fastId!, endAt)}
      />

      <TabBar />
    </main>
  );
}
