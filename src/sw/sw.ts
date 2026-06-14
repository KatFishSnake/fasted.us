/// <reference lib="webworker" />
/**
 * Service worker (plan §SW). Serwist handles precache + offline fallback.
 * Convex is the source of truth and the cron sweep only sends *pending* reminders,
 * so the server is authoritative; the SW can't read Convex (no auth token here),
 * so it applies the kind-based `shouldStillShow` fallback before showing.
 * tag=dedupKey collapses duplicate visuals. notificationclick deep-links into the
 * app; "End fast" edits open the in-app screen (not an action).
 */
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { shouldStillShow } from "../notifications/guards";
import { NOTIF_COPY, GENERIC_BODY } from "../notifications/copy";
import type { ReminderKind } from "../scheduling/schedule";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const PAYLOAD_VERSION = 1;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false, // no silent reload mid-fast; app shows an update toast
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

interface PushPayload {
  v: number;
  kind: ReminderKind;
  fastId?: string;
  dedupKey: string;
}

/** Read the open fast from the shared DB and derive state; null if unreadable. */
self.addEventListener("push", (event: PushEvent) => {
  event.waitUntil(
    (async () => {
      let payload: PushPayload | null = null;
      try {
        payload = event.data?.json() as PushPayload;
      } catch {
        payload = null;
      }
      if (!payload?.kind) return;

      // SW can't read Convex (no session); rely on the kind-based guard. The
      // server already only sends pending reminders, so this is belt-and-suspenders.
      if (!shouldStillShow(payload.kind, null)) return;

      const copy = NOTIF_COPY[payload.kind];
      const outdated = payload.v > PAYLOAD_VERSION;
      // `actions` is valid in the SW Notification context but missing from the
      // DOM lib's NotificationOptions — widen the type here.
      const options: NotificationOptions & { actions?: { action: string; title: string }[] } = {
        body: outdated ? GENERIC_BODY : copy.body,
        tag: payload.dedupKey, // collapse duplicates
        actions: outdated ? [] : copy.actions,
        data: payload,
        icon: "/icons/icon.svg",
        badge: "/icons/icon.svg",
        requireInteraction: copy.urgent,
      };
      await self.registration.showNotification(copy.title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const data = event.notification.data as PushPayload | undefined;
  // Deep-link target — tap-to-open is always guaranteed.
  const action = event.action;
  let url = "/";
  if (action === "start") url = "/?action=start";
  else if (action === "end" || data?.kind === "forgot") url = "/?action=end";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clients.find((c) => "focus" in c);
      if (existing) {
        await (existing as WindowClient).focus();
        (existing as WindowClient).navigate?.(url);
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
