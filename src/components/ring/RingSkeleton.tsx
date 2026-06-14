import { RING } from "@/lib/ring/geometry";

/** Shown until the client mounts + Dexie hydrates (no SSR Date.now mismatch). */
export function RingSkeleton() {
  return (
    <div
      className="animate-pulse rounded-full border-[22px] border-green-100"
      style={{ width: RING.size, height: RING.size, maxWidth: "78vw", aspectRatio: "1" }}
      aria-hidden
    />
  );
}
