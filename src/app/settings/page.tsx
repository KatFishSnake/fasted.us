"use client";
/** Settings — reminder prefs, data export, account (Convex-backed, auth-scoped). */
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMounted, useSettings, useHistory, usePlans } from "@/store/hooks";
import { TabBar } from "@/components/nav/TabBar";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { AccountCard } from "@/components/auth/AccountCard";
import type { ReminderPrefs } from "@/domain/types";

export default function SettingsPage() {
  const mounted = useMounted();
  const settings = useSettings();
  const history = useHistory();
  const plans = usePlans();
  const saveSettings = useMutation(api.settings.save);

  async function setPref<K extends keyof ReminderPrefs>(key: K, value: ReminderPrefs[K]) {
    if (!settings) return;
    await saveSettings({ reminderPrefs: { ...settings.reminderPrefs, [key]: value } });
    // Turning reminders off should actually stop closed-app push, not just hide UI.
    if (key === "enabled" && value === false) {
      const { convexClient } = await import("@/store/convex");
      const client = convexClient();
      if (client) {
        const { unsubscribeFromPush } = await import("@/push/subscribe");
        await unsubscribeFromPush(client);
      }
    }
  }

  function exportData() {
    const env = {
      format: "fasted.backup",
      version: 1,
      exportedAt: Date.now(),
      plans: plans ?? [],
      fasts: history ?? [],
      settings: settings ?? null,
    };
    const blob = new Blob([JSON.stringify(env, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fasted-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!mounted || !settings) {
    return (
      <main className="min-h-dvh px-5 pt-safe">
        <div className="mt-5 h-8 w-32 animate-pulse rounded bg-green-100" />
        <TabBar />
      </main>
    );
  }

  const p = settings.reminderPrefs;

  return (
    <main className="min-h-dvh px-5 pt-safe">
      <h1 className="mb-4 mt-5 text-2xl font-bold text-ink">Settings</h1>

      <Section title="Account" bare>
        <AccountCard />
      </Section>

      <Section title="Reminders" note="Best-effort under Android Doze; on-open catch-up always reconciles.">
        <Switch label="Reminders enabled" checked={p.enabled} onChange={(v) => setPref("enabled", v)} />
        <Switch label="30 min before" checked={p.preStart} disabled={!p.enabled} onChange={(v) => setPref("preStart", v)} />
        <Switch label="At start time" checked={p.start} disabled={!p.enabled} onChange={(v) => setPref("start", v)} />
        <Switch label="Goal reached" checked={p.goal} disabled={!p.enabled} onChange={(v) => setPref("goal", v)} />
        <Switch label="Overtime nudges" checked={p.overtime} disabled={!p.enabled} onChange={(v) => setPref("overtime", v)} />
        <Switch label="Forgot to end" checked={p.forgot} disabled={!p.enabled} onChange={(v) => setPref("forgot", v)} />
        <Switch
          label="Email backstop"
          description="Email isn't Doze-throttled — a more reliable closed-app nudge. Off by default."
          checked={p.emailBackstop}
          disabled={!p.enabled}
          onChange={(v) => setPref("emailBackstop", v)}
        />
      </Section>

      <Section title="Data" note="Your fasts sync to your account. Export a JSON backup anytime." bare>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={exportData}>
            Export backup
          </Button>
        </div>
      </Section>

      <TabBar />
    </main>
  );
}

function Section({
  title,
  note,
  bare,
  children,
}: {
  title: string;
  note?: string;
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      {note && <p className="mb-2 text-sm text-ink-soft">{note}</p>}
      {bare ? (
        children
      ) : (
        <div className="divide-y divide-hairline rounded-[var(--radius-md)] bg-surface px-4 shadow-[var(--shadow-card)]">
          {children}
        </div>
      )}
    </section>
  );
}
