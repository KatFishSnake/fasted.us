"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { SystemClock } from "@/domain/clock";
import { validateStart } from "@/domain/validation";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (opts?: { startAt?: number }) => Promise<void>;
}

/** Start a fast now, or backdate ("I started 2h ago") — a real start the user asserts. */
export function StartSheet({ open, onOpenChange, onStart }: Props) {
  const [backdate, setBackdate] = useState(false);
  const [value, setValue] = useState(() => toDatetimeLocalValue(SystemClock.now()));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startNow() {
    setBusy(true);
    try {
      await onStart();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  async function startBackdated() {
    const startAt = fromDatetimeLocalValue(value);
    const v = validateStart(startAt, SystemClock.now());
    if (!v.ok) {
      setError(v.message ?? "Invalid time");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onStart({ startAt });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Start fast">
      {!backdate ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-soft">Start your fast now and we'll track from this moment.</p>
          <Button full disabled={busy} onClick={startNow}>
            Start now
          </Button>
          <Button variant="ghost" full onClick={() => setBackdate(true)}>
            I started earlier…
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-ink-soft" htmlFor="start-time">
            When did you start?
          </label>
          <input
            id="start-time"
            type="datetime-local"
            value={value}
            max={toDatetimeLocalValue(SystemClock.now())}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-[var(--radius-md)] border border-hairline bg-bg px-4 py-3 text-base"
          />
          {error && <p className="text-sm text-accent-500">{error}</p>}
          <Button full disabled={busy} onClick={startBackdated}>
            Start fast
          </Button>
          <Button variant="ghost" full onClick={() => setBackdate(false)}>
            Back
          </Button>
        </div>
      )}
    </Sheet>
  );
}
