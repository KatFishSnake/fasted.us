"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer, Calendar, Settings } from "lucide-react";

const TABS = [
  { href: "/", label: "Timer", Icon: Timer },
  { href: "/history", label: "History", Icon: Calendar },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[414px] items-stretch justify-around border-t border-hairline bg-surface/95 pb-safe backdrop-blur"
      aria-label="Primary"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              active ? "text-green-700" : "text-ink-faint"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.9} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
