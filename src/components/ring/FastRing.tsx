"use client";
/**
 * FastRing — presentational SVG ring (plan §Ring). Animates via one
 * CSS-transitioned stroke-dashoffset (compositor; no rAF loop). Overtime turns
 * amber with an inner lap. Center content is provided by the parent.
 */
import { RING, dashOffset, pointOnRing, stageFraction } from "@/lib/ring/geometry";
import { STAGES } from "@/domain/stages";
import type { DerivedState } from "@/domain/types";

interface Props {
  state: DerivedState;
  reducedMotion: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  onCenterTap?: () => void;
}

export function FastRing({ state, reducedMotion, ariaLabel, children, onCenterTap }: Props) {
  const isOvertime = state.overtimeMs > 0;
  const fillColor = isOvertime ? "var(--color-amber-500)" : "var(--color-green-600)";
  const trackColor = "var(--color-green-200)";

  // Inner overtime lap fraction (how far past goal, capped at one extra lap).
  const overtimeFrac = state.targetMs > 0 ? Math.min(1, state.overtimeMs / state.targetMs) : 0;

  const showStages = state.status !== "idle" && state.targetMs > 0;
  const goalPoint = pointOnRing(1);

  return (
    <div className="relative" style={{ width: RING.size, height: RING.size, maxWidth: "78vw", aspectRatio: "1" }}>
      <svg
        viewBox={`0 0 ${RING.size} ${RING.size}`}
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Track */}
        <circle
          cx={RING.center}
          cy={RING.center}
          r={RING.radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={RING.stroke}
          strokeLinecap="round"
        />
        {/* Progress fill */}
        <circle
          cx={RING.center}
          cy={RING.center}
          r={RING.radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={RING.stroke}
          strokeLinecap="round"
          strokeDasharray={RING.circumference}
          strokeDashoffset={dashOffset(state.progressClamped)}
          style={{
            transition: reducedMotion ? "none" : "stroke-dashoffset 0.6s var(--ease-out), stroke 0.4s linear",
          }}
        />
        {/* Inner overtime lap */}
        {isOvertime && (
          <circle
            cx={RING.center}
            cy={RING.center}
            r={RING.radius - RING.stroke - 4}
            fill="none"
            stroke="var(--color-accent-500)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (RING.radius - RING.stroke - 4)}
            strokeDashoffset={2 * Math.PI * (RING.radius - RING.stroke - 4) * (1 - overtimeFrac)}
            style={{ transition: reducedMotion ? "none" : "stroke-dashoffset 0.6s var(--ease-out)" }}
          />
        )}
        {/* Stage badge dots + goal marker */}
        {showStages &&
          STAGES.map((s) => {
            const frac = stageFraction(s.atHours, state.targetMs);
            if (frac <= 0 || frac >= 1) return null;
            const p = pointOnRing(frac);
            const reached = state.elapsedMs >= s.atHours * 3_600_000;
            return (
              <circle
                key={s.key}
                cx={p.x}
                cy={p.y}
                r={5}
                fill="var(--color-surface)"
                stroke={reached ? "var(--color-green-700)" : "var(--color-green-200)"}
                strokeWidth={2}
                opacity={reached ? 1 : 0.45}
              />
            );
          })}
        {showStages && (
          <circle
            cx={goalPoint.x}
            cy={goalPoint.y}
            r={7}
            fill={state.goalMet ? "var(--color-accent-500)" : "var(--color-surface)"}
            stroke="var(--color-accent-500)"
            strokeWidth={2}
          />
        )}
      </svg>

      {/* Center content (counts up/down, plan label, CTA hint) */}
      <button
        type="button"
        onClick={onCenterTap}
        className="absolute inset-0 flex flex-col items-center justify-center rounded-full text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        aria-label="Toggle remaining and elapsed time"
      >
        {children}
      </button>
    </div>
  );
}
