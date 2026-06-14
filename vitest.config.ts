import { defineConfig } from "vitest/config";

// Backend tests only (convex-test needs the edge-runtime VM + Vite's
// import.meta.glob). Domain/scheduling tests run under `bun test ./tests`.
export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
