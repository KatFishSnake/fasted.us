"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import { MS } from "@/domain/constants";
import type { Plan } from "@/domain/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  activePlanId: string | null;
}

export function PlansSheet({ open, onOpenChange, plans, activePlanId }: Props) {
  const [customHours, setCustomHours] = useState("16");
  const [error, setError] = useState<string | null>(null);
  const saveSettings = useMutation(api.settings.save);
  const upsertCustom = useMutation(api.plans.upsertCustom);

  async function choose(id: string) {
    await saveSettings({ activePlanId: id });
    onOpenChange(false);
  }

  async function saveCustom() {
    const hours = Number(customHours);
    if (!Number.isFinite(hours) || hours < 1 || hours >= 24) {
      setError("Enter 1–23 hours");
      return;
    }
    setError(null);
    const id = await upsertCustom({ label: `${hours}:${24 - hours}`, fastingMs: Math.round(hours * MS.HOUR) });
    await choose(id);
  }

  const presets = plans.filter((p) => !p.isCustom);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Choose your plan">
      <div className="flex flex-col gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => choose(p.id)}
            className="flex items-center justify-between rounded-[var(--radius-md)] border border-hairline px-4 py-3 text-left active:scale-[0.99]"
          >
            <span>
              <span className="font-semibold text-ink">{p.label}</span>
              <span className="ml-2 text-sm text-ink-faint">{p.fastingMs / MS.HOUR}h fast</span>
            </span>
            {p.id === activePlanId && <Check size={20} className="text-green-600" aria-label="Selected" />}
          </button>
        ))}

        <div className="mt-3 rounded-[var(--radius-md)] border border-hairline px-4 py-3">
          <p className="mb-2 text-sm font-medium text-ink-soft">Custom fasting window</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={23}
              value={customHours}
              onChange={(e) => setCustomHours(e.target.value)}
              className="w-20 rounded-[var(--radius-sm)] border border-hairline bg-bg px-3 py-2 text-base"
              aria-label="Custom fasting hours"
            />
            <span className="text-sm text-ink-faint">hours fasting</span>
            <Button className="ml-auto" onClick={saveCustom}>
              Use
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-accent-500">{error}</p>}
        </div>
      </div>
    </Sheet>
  );
}
