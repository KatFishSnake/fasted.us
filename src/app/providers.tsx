"use client";
/**
 * Single client boundary. Convex is the store and EVERYTHING is behind auth:
 * AuthGate shows the sign-in screen until the user has an identity, then seeds
 * presets/settings once and renders the app. No local Dexie.
 */
import { useEffect, useState } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { convexClient } from "@/store/convex";
import { SignIn } from "@/components/auth/SignIn";
import { RemindersSync } from "@/scheduling/RemindersSync";

function useServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
}

function Splash() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="h-10 w-10 animate-pulse rounded-full bg-green-200" />
    </main>
  );
}

/** Requires an identity; seeds presets + settings once after sign-in. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const settings = useQuery(api.settings.get, isAuthenticated ? {} : "skip");
  const ensureSeeded = useMutation(api.plans.ensureSeeded);
  const saveSettings = useMutation(api.settings.save);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || settings === undefined || settings !== null || seeding) return;
    // First run for this account: create presets + an initial settings row.
    setSeeding(true);
    (async () => {
      const defaultPlanId = await ensureSeeded({});
      await saveSettings({ activePlanId: defaultPlanId ?? null, hasOnboarded: false });
    })().catch(() => setSeeding(false));
  }, [isAuthenticated, settings, seeding, ensureSeeded, saveSettings]);

  if (isLoading) return <Splash />;
  if (!isAuthenticated) return <SignIn />;
  if (settings === undefined || settings === null) return <Splash />; // seeding
  return (
    <>
      <RemindersSync />
      {children}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  useServiceWorker();
  const client = convexClient();

  if (!client) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-8 text-center text-ink-soft">
        Cloud backend isn&apos;t configured (set NEXT_PUBLIC_CONVEX_URL).
      </main>
    );
  }

  return (
    <ConvexAuthProvider client={client}>
      <AuthGate>{children}</AuthGate>
    </ConvexAuthProvider>
  );
}
