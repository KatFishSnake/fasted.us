import type { MetadataRoute } from "next";

/** PWA manifest (plan §PWA shell): standalone, portrait, themed, shortcuts. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fasted — Intermittent Fasting",
    short_name: "Fasted",
    description: "A calm, honest intermittent-fasting tracker.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f4",
    theme_color: "#34b06a",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Start fast", short_name: "Start", url: "/?action=start" },
      { name: "End fast", short_name: "End", url: "/?action=end" },
    ],
  };
}
