/** Presentation formatters — pure, locale-light (EN V1). */
import { MS } from "../domain/constants";

/** "12:32:02" countdown for the ring center. */
export function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** "16h 04m" compact human duration for history rows. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MS.MINUTE));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** "in 3:28" style HH:MM for milestone eta. */
export function formatEta(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MS.MINUTE));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** "8:00 PM" clock time in a given zone. */
export function formatClock(epochMs: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeZone && timeZone !== "device" ? timeZone : undefined,
  }).format(epochMs);
}

/** "Mon, Jun 14" date label. */
export function formatDate(epochMs: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timeZone && timeZone !== "device" ? timeZone : undefined,
  }).format(epochMs);
}

/** Convert an epoch ms to the value an <input type="datetime-local"> expects. */
export function toDatetimeLocalValue(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse an <input type="datetime-local"> value back to epoch ms (local zone). */
export function fromDatetimeLocalValue(value: string): number {
  return new Date(value).getTime();
}
