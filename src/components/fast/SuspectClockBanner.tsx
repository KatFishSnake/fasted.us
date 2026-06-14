"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

/** Surfaced when a fast has run 7+ days — likely a clock change (never auto-completed). */
export function SuspectClockBanner({ fastId }: { fastId: string | null }) {
  const [busy, setBusy] = useState(false);
  const abandon = useMutation(api.fasts.abandon);

  async function discard() {
    if (!fastId) return;
    setBusy(true);
    try {
      await abandon({ fastId: fastId as never });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
      <div>
        <p className="font-medium text-ink">This fast has run 7+ days.</p>
        <p className="text-ink-soft">Your device clock may have changed. End it from the ring, or discard it.</p>
        <button onClick={discard} disabled={busy} className="mt-1 font-semibold text-accent-500 underline">
          Discard fast
        </button>
      </div>
    </div>
  );
}
