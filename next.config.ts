import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Service worker source + output. The SW imports the shared Dexie db
  // (data/db.ts) so the one-open-fast invariant holds across window + SW.
  swSrc: "src/sw/sw.ts",
  swDest: "public/sw.js",
  // No silent reload mid-fast — the app surfaces an update toast instead.
  reloadOnOnline: false,
  // Disable in dev so SW caching never masks local changes.
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist({
  reactStrictMode: true,
  // Convex types live outside src; keep builds resilient.
  typescript: { ignoreBuildErrors: false },
});
