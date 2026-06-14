"use client";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] font-semibold transition-colors select-none active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:pointer-events-none min-h-[44px] px-5";

const variants: Record<Variant, string> = {
  primary: "bg-green-600 text-white shadow-[var(--shadow-soft)] hover:bg-green-700",
  secondary: "bg-green-50 text-green-700 hover:bg-green-100",
  ghost: "text-ink-soft hover:bg-green-50",
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", full, className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
});
