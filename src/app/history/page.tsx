"use client";
/** History — list + honest total-hours record (plan §Scope, decision 3). */
import { useMounted, useHistory } from "@/store/hooks";
import { TabBar } from "@/components/nav/TabBar";
import { formatDuration, formatDate, formatClock } from "@/lib/format";
import { Check } from "lucide-react";
import type { Fast } from "@/domain/types";

export default function HistoryPage() {
  const mounted = useMounted();
  const history = useHistory();

  const completed = (history ?? []).filter((f) => f.status === "completed" && f.endAt != null);
  // Honest record: Σ(endAt − startAt) over completed fasts — not gamified.
  const totalMs = completed.reduce((sum, f) => sum + ((f.endAt ?? 0) - f.startAt), 0);
  const totalHours = Math.floor(totalMs / 3_600_000);

  return (
    <main className="flex min-h-dvh flex-col px-5 pt-safe">
      <header className="mb-4 mt-5">
        <h1 className="text-2xl font-bold text-ink">History</h1>
        <p className="text-sm text-ink-soft">
          {completed.length} fast{completed.length === 1 ? "" : "s"} · {totalHours}h total fasted
        </p>
      </header>

      {!mounted ? (
        <SkeletonRows />
      ) : completed.length === 0 ? (
        <Empty />
      ) : (
        <ul className="divide-y divide-hairline">
          {completed.map((f) => (
            <Row key={f.id} fast={f} />
          ))}
        </ul>
      )}

      <TabBar />
    </main>
  );
}

function Row({ fast }: { fast: Fast }) {
  const duration = (fast.endAt ?? 0) - fast.startAt;
  const tz = fast.tzAtStart;
  return (
    <li className="flex items-center justify-between py-3.5">
      <div>
        <p className="font-medium text-ink">{formatDate(fast.startAt, tz)}</p>
        <p className="text-sm text-ink-faint">
          {formatClock(fast.startAt, tz)} → {formatClock(fast.endAt ?? 0, tz)} · {fast.planKindSnapshot}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="tabular font-semibold text-ink">{formatDuration(duration)}</span>
        {fast.goalMet && <Check size={18} className="text-green-600" aria-label="Goal met" />}
      </div>
    </li>
  );
}

function Empty() {
  return (
    <div className="mt-16 flex flex-col items-center gap-2 text-center">
      <p className="text-lg font-semibold text-ink">No fasts yet</p>
      <p className="text-sm text-ink-soft">Start your first fast from the Timer tab.</p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-[var(--radius-md)] bg-green-100/60" />
      ))}
    </div>
  );
}
