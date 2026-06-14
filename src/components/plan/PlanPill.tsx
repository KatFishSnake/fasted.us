"use client";
import { Pencil } from "lucide-react";

interface Props {
  label: string;
  onEdit: () => void;
}

/** "My plan | 16:8 ✎" pill — the plan affordance from the reference UI. */
export function PlanPill({ label, onEdit }: Props) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-sm shadow-[var(--shadow-card)] active:scale-[0.99]"
    >
      <span className="text-ink-faint">My plan</span>
      <span className="h-3 w-px bg-hairline" aria-hidden />
      <span className="font-semibold text-ink">{label}</span>
      <Pencil size={14} className="text-green-600" aria-hidden />
      <span className="sr-only">Edit plan</span>
    </button>
  );
}
