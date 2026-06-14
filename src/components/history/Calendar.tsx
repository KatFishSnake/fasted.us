"use client";
/**
 * History calendar (plan §Scope: "history (list + calendar)"). Month grid that
 * buckets completed fasts by their device-local start day, marks days that had a
 * fast (green), flags goal-met days, and surfaces compact hours-per-day. Pure
 * presentation over the same `completed` fasts the list view uses.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayKey } from "@/lib/format";
import type { Fast } from "@/domain/types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DayAgg {
  ms: number;
  count: number;
  goalMet: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const cellKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

export function HistoryCalendar({ fasts }: { fasts: Fast[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  // Bucket completed fasts by device-local start day.
  const byDay = new Map<string, DayAgg>();
  for (const f of fasts) {
    const key = dayKey(f.startAt);
    const ms = (f.endAt ?? 0) - f.startAt;
    const prev = byDay.get(key);
    if (prev) {
      prev.ms += ms;
      prev.count += 1;
      prev.goalMet = prev.goalMet || !!f.goalMet;
    } else {
      byDay.set(key, { ms, count: 1, goalMet: !!f.goalMet });
    }
  }

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const todayKey = cellKey(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const step = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-ink-soft hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-semibold text-ink">
          {MONTHS[cursor.month]} {cursor.year}
        </h2>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-ink-soft hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="pb-1 text-xs font-medium text-ink-faint">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const key = cellKey(cursor.year, cursor.month, day);
          const agg = byDay.get(key);
          const isToday = key === todayKey;
          const hours = agg ? Math.floor(agg.ms / 3_600_000) : 0;
          return (
            <div
              key={key}
              className={[
                "flex aspect-square flex-col items-center justify-center rounded-[var(--radius-sm)] text-sm",
                agg ? "bg-green-100 font-semibold text-green-700" : "text-ink-soft",
                isToday ? "ring-2 ring-green-600 ring-inset" : "",
              ].join(" ")}
              aria-label={
                agg
                  ? `${MONTHS[cursor.month]} ${day}: ${agg.count} fast${agg.count === 1 ? "" : "s"}, ${hours}h${agg.goalMet ? ", goal met" : ""}`
                  : `${MONTHS[cursor.month]} ${day}: no fast`
              }
            >
              <span>{day}</span>
              {agg && (
                <span className="tabular text-[10px] font-medium leading-none text-green-600">
                  {hours}h
                </span>
              )}
              {agg?.goalMet && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-accent-500" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-green-100" /> Fasting day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> Goal met
        </span>
      </div>
    </div>
  );
}
