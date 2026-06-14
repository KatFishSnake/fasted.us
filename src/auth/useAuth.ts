"use client";
/** Auth surface for the UI (plan §Auth & Sync — Google only). */
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCallback } from "react";

export interface Viewer {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

export function useAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer) as Viewer | null | undefined;

  const signInGoogle = useCallback(() => signIn("google"), [signIn]);

  return { isAuthenticated, isLoading, viewer, signInGoogle, signOut };
}
