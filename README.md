# Fasted — Intermittent Fasting PWA

A mobile-first intermittent-fasting tracker. Next.js App Router + Tailwind v4 +
**Convex** (single source of truth, **everything behind Convex Auth**). Installable
PWA; later wrappable as a native app via Capacitor over the same code.

See [`.context/attachments/.../plan.md`](.context) for the original plan and
[`DESIGN.md`](DESIGN.md) for the design system.

## Develop

```bash
bun install
bun run convex        # `convex dev` — deploy functions + watch (needed for the app to work)
bun run dev           # Next.js dev (service worker disabled in dev)
bun test              # pure-domain + scheduling + guard unit tests (bun)
bun run test:e2e      # Playwright e2e — boots `next dev -p 3100`, real browser + Convex
bun run typecheck     # tsc --noEmit
bun run build         # production build (also bundles the Serwist SW → public/sw.js)
```

## Architecture (load-bearing)

- **Convex is the store; everything is behind auth.** Every query/mutation is scoped to
  `getAuthUserId(ctx)` — a user can never read or write another user's rows. Convex's
  reactivity gives cross-tab + multi-device updates for free (no Dexie, no sync engine).
- **State is a pure function of stored timestamps + the clock.** `domain/state.ts`
  `deriveState(now, fast, …)` is the single canonical derivation. The Convex `fasts.getOpen`
  result feeds it; nothing depends on a timer having fired. The one-open-fast invariant is a
  serializable "is a fast already active?" check in `fasts.start`.
- **Auth.** Convex Auth. **Google** is the production provider; an **Anonymous** provider is
  included so the app runs and is e2e-testable before Google OAuth secrets are configured.
- **Reminders are best-effort.** A PWA cannot guarantee alarm-grade notifications. A 1-minute
  Convex cron sweep is the authoritative sender (Web Push + opt-in Resend email backstop,
  which isn't Doze-throttled); the SW applies a kind-based guard; on-open reconciliation via
  `deriveState` is the reliable catch-up.

## What's implemented now (verified)

- ✅ Pure domain core (clock, constants, types, stages, `deriveState`, validation) — **26 unit tests**
- ✅ Reminder scheduling (planned rolling-window + active, DST-safe via Temporal) — tested
- ✅ Convex backend: auth (Google + Anonymous), `plans`/`fasts`/`settings` CRUD, reminders
  diff, webpush subscribe/prune, 1-min cron sweep (Web Push + Resend backstop) — all user-scoped, deployed
- ✅ Ring + Home (idle/active/overtime, goal-crossing confetti, stage line)
- ✅ History (list + honest total-hours), Settings (reminder prefs, export, account), Onboarding, SignIn
- ✅ SW push/notificationclick handlers + `shouldStillShow` guard
- ✅ **10 Playwright e2e PASS** against the live Convex deployment (onboarding, start/end, ring, history, settings, export)
- 🔜 Google sign-in creds, Web Push VAPID + Resend domain (config), Milestone-0 push spike (hardware)
- 🔜 History calendar view; reconciliation-summary modal; snooze action handlers

## Deployment & secrets

Host on HTTPS (Vercel). Convex deployment env (dev already has Convex Auth JWT keys + SITE_URL):
- **Google sign-in:** `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (Google Cloud OAuth client).
- **Web Push:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (Convex) + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client).
- **Email backstop:** `RESEND_API_KEY` (set), `RESEND_FROM` on a verified domain.
`.env.local` holds the Convex dev deployment URL + Resend key for this workspace.
