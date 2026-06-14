"use client";
import * as RadixSwitch from "@radix-ui/react-switch";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: Props) {
  return (
    <label className="flex items-center justify-between gap-4 py-3">
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {description && <span className="block text-sm text-ink-faint">{description}</span>}
      </span>
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="relative h-6 w-11 shrink-0 rounded-full bg-hairline transition-colors data-[state=checked]:bg-green-600 disabled:opacity-50"
      >
        <RadixSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
      </RadixSwitch.Root>
    </label>
  );
}
