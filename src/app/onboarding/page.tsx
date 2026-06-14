"use client";
/** First-run onboarding (plan §User journey): pick plan → start time → reminders. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMounted, usePlans, useSettings } from "@/store/hooks";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import { MS } from "@/domain/constants";

export default function OnboardingPage() {
  const mounted = useMounted();
  const router = useRouter();
  const plans = usePlans();
  const settings = useSettings();
  const saveSettings = useMutation(api.settings.save);
  const setScheduledStart = useMutation(api.plans.setScheduledStart);

  const [step, setStep] = useState(0);
  const [planId, setPlanId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("20:00");
  const [reminders, setReminders] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!mounted || !plans || !settings) {
    return <main className="min-h-dvh" />;
  }

  const chosen = planId ?? settings.activePlanId ?? plans[0]?.id ?? null;

  async function finish() {
    setBusy(true);
    try {
      if (chosen) {
        await setScheduledStart({ planId: chosen as Id<"plans">, scheduledStartLocal: startTime });
      }
      if (reminders && typeof Notification !== "undefined" && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          /* ignore */
        }
      }
      await saveSettings({
        activePlanId: chosen,
        hasOnboarded: true,
        reminderPrefs: { ...settings!.reminderPrefs, enabled: reminders },
      });
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-10 pt-safe">
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-green-600" : "bg-hairline"}`} />
        ))}
      </div>

      <div className="mt-10 flex-1">
        {step === 0 && (
          <>
            <h1 className="text-3xl font-bold text-ink">Pick your plan</h1>
            <p className="mt-1 text-ink-soft">You can change this anytime.</p>
            <div className="mt-6 flex flex-col gap-2">
              {plans
                .filter((p) => !p.isCustom)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlanId(p.id)}
                    className={`flex items-center justify-between rounded-[var(--radius-md)] border px-4 py-4 text-left ${
                      chosen === p.id ? "border-green-600 bg-green-50" : "border-hairline"
                    }`}
                  >
                    <span>
                      <span className="text-lg font-semibold text-ink">{p.label}</span>
                      <span className="ml-2 text-sm text-ink-faint">{p.fastingMs / MS.HOUR}h fast</span>
                    </span>
                    {chosen === p.id && <Check className="text-green-600" />}
                  </button>
                ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-3xl font-bold text-ink">When do you usually start?</h1>
            <p className="mt-1 text-ink-soft">We'll remind you 30 min before — best effort.</p>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-6 w-full rounded-[var(--radius-md)] border border-hairline bg-bg px-4 py-4 text-2xl tabular"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-3xl font-bold text-ink">Reminders</h1>
            <p className="mt-1 text-ink-soft">
              A PWA can't guarantee alarm-grade alerts, but we'll nudge you when we can and always catch you up when
              you open the app.
            </p>
            <label className="mt-6 flex items-center gap-3 rounded-[var(--radius-md)] border border-hairline px-4 py-4">
              <input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} className="h-5 w-5" />
              <span className="font-medium text-ink">Enable reminders</span>
            </label>
          </>
        )}
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button full onClick={() => setStep((s) => s + 1)}>
            Continue
          </Button>
        ) : (
          <Button full disabled={busy} onClick={finish}>
            Start fasting
          </Button>
        )}
      </div>
    </main>
  );
}
