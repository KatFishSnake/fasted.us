/**
 * Ring geometry — pure, presentational math (plan §Ring).
 * SVG viewBox 280, stroke 22, arc rotated −90° so progress starts at 12 o'clock.
 */
export const RING = {
  size: 280,
  stroke: 22,
  get radius() {
    return (this.size - this.stroke) / 2;
  },
  get center() {
    return this.size / 2;
  },
  get circumference() {
    return 2 * Math.PI * this.radius;
  },
} as const;

/** stroke-dashoffset for a [0,1] progress fraction (0 = empty, 1 = full). */
export function dashOffset(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return RING.circumference * (1 - p);
}

/** Point on the ring for a [0,1] fraction (badges, goal marker). 0 = top, clockwise. */
export function pointOnRing(fraction: number): { x: number; y: number } {
  const angle = fraction * 2 * Math.PI - Math.PI / 2; // −90° start
  return {
    x: RING.center + RING.radius * Math.cos(angle),
    y: RING.center + RING.radius * Math.sin(angle),
  };
}

/** Stage badge fraction = stage hours / total target hours, clamped to [0,1]. */
export function stageFraction(stageHours: number, targetMs: number): number {
  const targetHours = targetMs / 3_600_000;
  if (targetHours <= 0) return 0;
  return Math.min(1, Math.max(0, stageHours / targetHours));
}
