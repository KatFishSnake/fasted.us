"use client";
/**
 * Web Push subscription bridge (plan §Permission UX). Subscribes the installed
 * PWA's service worker to push and registers the subscription with Convex
 * (scoped to the authed user). Gated on a configured VAPID public key + granted
 * notification permission; no-ops otherwise so the app stays functional.
 */
import type { ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(convex: ConvexReactClient): Promise<boolean> {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid || typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      }));

    const json = sub.toJSON();
    await convex.mutation(api.webpush.subscribe, {
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: navigator.language || "en",
    });
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(convex: ConvexReactClient): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await convex.mutation(api.webpush.unsubscribe, { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
  } catch {
    /* ignore */
  }
}
