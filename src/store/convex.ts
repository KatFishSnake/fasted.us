"use client";
/** Singleton ConvexReactClient (or null when no deployment URL is configured). */
import { ConvexReactClient } from "convex/react";

let _client: ConvexReactClient | null | undefined;

export function convexClient(): ConvexReactClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  _client = url ? new ConvexReactClient(url) : null;
  return _client;
}
