"use client";
/** Sign-in screen — first step, gates the whole app (plan §Auth & Sync). */
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/Button";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(provider: string) {
    setBusy(provider);
    setError(null);
    try {
      await signIn(provider);
    } catch {
      setError(
        provider === "google"
          ? "Google sign-in isn't configured yet. Use the option below to continue."
          : "Couldn't sign in. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-green-600 text-3xl">
        ⏱
      </div>
      <h1 className="mt-4 text-3xl font-bold text-ink">Fasted</h1>
      <p className="mt-2 max-w-xs text-ink-soft">
        A calm, honest intermittent-fasting tracker. Sign in to sync your fasts across devices.
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button full disabled={busy !== null} onClick={() => run("google")}>
          {busy === "google" ? "Opening Google…" : "Continue with Google"}
        </Button>
        <Button variant="ghost" full disabled={busy !== null} onClick={() => run("anonymous")}>
          {busy === "anonymous" ? "Setting up…" : "Continue without an account"}
        </Button>
        {error && <p className="text-sm text-accent-500">{error}</p>}
      </div>

      <p className="mt-8 max-w-xs text-xs text-ink-faint">
        Your fasting data is stored in your account (it leaves this device). That's the tradeoff for cross-device sync.
      </p>
    </main>
  );
}
