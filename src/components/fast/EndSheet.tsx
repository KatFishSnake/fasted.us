"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { SystemClock } from "@/domain/clock";
import { validateEnd } from "@/domain/validation";
import { formatDuration, toDatetimeLocalValue, fromDatetimeLocalValue } from "@/lib/format";
import type { DerivedState } from "@/domain/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: DerivedState;
  onEnd: (endAt?: number) => Promise<void>;
}

/** End now, or retroactively edit the end time. */
export function EndSheet({ open, onOpenChange, state, onEnd }: Props) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(() => toDatetimeLocalValue(SystemClock.now()));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function endNow() {
    setBusy(true);
    try {
      await onEnd();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  async function endEdited() {
    const endAt = fromDatetimeLocalValue(value);
    const v = validateEnd(state.startAt ?? 0, endAt);
    if (!v.ok && v.code !== "suspect-clock") {
      setError(v.message ?? "Invalid time");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onEnd(endAt);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="End fast">
      <div className="mb-4 rounded-[var(--radius-md)] bg-green-50 px-4 py-3">
        <p className="text-sm text-ink-soft">You fasted</p>
        <p className="tabular text-2xl font-bold text-green-700">{formatDuration(state.elapsedMs)}</p>
        <p className="text-sm text-ink-soft">{state.goalMet ? "Goal reached 🎉" : "Goal not yet reached"}</p>
      </div>
      {!edit ? (
        <div className="flex flex-col gap-3">
          <Button full disabled={busy} onClick={endNow}>
            End now
          </Button>
          <Button variant="ghost" full onClick={() => setEdit(true)}>
            Edit end time…
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-ink-soft" htmlFor="end-time">
            When did you end?
          </label>
          <input
            id="end-time"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-[var(--radius-md)] border border-hairline bg-bg px-4 py-3 text-base"
          />
          {error && <p className="text-sm text-accent-500">{error}</p>}
          <Button full disabled={busy} onClick={endEdited}>
            Save & end
          </Button>
          <Button variant="ghost" full onClick={() => setEdit(false)}>
            Back
          </Button>
        </div>
      )}
    </Sheet>
  );
}
