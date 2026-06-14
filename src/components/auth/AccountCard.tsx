"use client";
/** Account card — Google sign-in / signed-in identity (plan §Auth & Sync). */
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/Button";
import { convexClient } from "@/store/convex";

export function AccountCard() {
  // No deployment configured → sync unavailable; keep the app local-first.
  if (!convexClient()) {
    return (
      <div className="rounded-[var(--radius-md)] border border-hairline px-4 py-3">
        <p className="text-sm text-ink-soft">Cloud sync isn't configured for this build. Your data stays on this device.</p>
      </div>
    );
  }
  return <AccountCardInner />;
}

function AccountCardInner() {
  const { isAuthenticated, isLoading, viewer, signInGoogle, signOut } = useAuth();

  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-[var(--radius-md)] bg-green-100/60" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-[var(--radius-md)] border border-hairline px-4 py-3">
        <p className="text-sm text-ink-soft">
          Sign in with Google to sync your fasts across devices. Your fasting data leaves this device and is stored in
          your account.
        </p>
        <Button variant="secondary" className="mt-3 w-full" onClick={() => signInGoogle()}>
          Continue with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-hairline px-4 py-3">
      <div>
        <p className="font-medium text-ink">{viewer?.name ?? "Signed in"}</p>
        {viewer?.email && <p className="text-sm text-ink-faint">{viewer.email}</p>}
        <p className="text-xs text-green-700">Syncing across your devices</p>
      </div>
      <Button variant="ghost" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
}
