/**
 * Convex Auth (plan §Auth & Sync). Google is the production provider (decision 7);
 * Anonymous is included so the app runs fully behind auth and is testable/dogfoodable
 * before Google OAuth credentials (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) are configured.
 * Every query/mutation scopes data to getAuthUserId(ctx) — no client-supplied identity.
 */
import Google from "@auth/core/providers/google";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Anonymous],
});
