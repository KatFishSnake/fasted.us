import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fasted — Intermittent Fasting",
  description: "A calm, honest intermittent-fasting tracker.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Fasted" },
};

export const viewport: Viewport = {
  themeColor: "#34b06a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // No maximum-scale — keep pinch-zoom for accessibility.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          <div className="mx-auto min-h-dvh max-w-[414px] pb-20">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
