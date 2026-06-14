/** Goal celebration — lazy confetti, reduced-motion safe (plan §interaction). */
export async function celebrate(reducedMotion: boolean): Promise<void> {
  if (reducedMotion || typeof window === "undefined") return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.4 },
      colors: ["#34b06a", "#1f9a59", "#f4613a"],
    });
  } catch {
    /* confetti is non-essential */
  }
}
