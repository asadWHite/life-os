"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, CalendarRange, ChartLine, UserRound, type LucideIcon } from "lucide-react";
import { useI18n } from "./i18n-provider";

interface Item {
  href: string;
  key: "nav_today" | "nav_sleep" | "nav_plan" | "nav_progress" | "nav_profile";
  icon: LucideIcon;
}

const ITEMS: Item[] = [
  { href: "/today", key: "nav_today", icon: Sun },
  { href: "/sleep", key: "nav_sleep", icon: Moon },
  { href: "/plan", key: "nav_plan", icon: CalendarRange },
  { href: "/progress", key: "nav_progress", icon: ChartLine },
  { href: "/profile", key: "nav_profile", icon: UserRound },
];

export function AppNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Desktop: floating left rail */}
      <nav
        aria-label="Primary"
        className="glass fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-full p-2 md:flex"
      >
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={t[item.key]}
              className={`group relative grid h-12 w-12 place-items-center rounded-full transition-all duration-200 ${
                active ? "bg-accent text-accent-ink shadow-[0_6px_18px_rgba(0,0,0,0.2)]" : "text-ink-3 hover:bg-sunken hover:text-ink"
              }`}
            >
              <item.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="pointer-events-none absolute left-[calc(100%+14px)] rounded-lg border border-line bg-raised px-2.5 py-1 text-[12px] font-medium text-ink opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                {t[item.key]}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile: bottom floating pill */}
      <nav
        aria-label="Primary"
        className="glass fixed inset-x-4 bottom-4 z-50 flex items-center justify-between rounded-full p-1.5 md:hidden"
      >
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={t[item.key]}
              className={`grid h-11 min-w-[52px] flex-1 place-items-center rounded-full transition-all duration-200 ${
                active ? "bg-accent text-accent-ink" : "text-ink-3"
              }`}
            >
              <item.icon size={21} strokeWidth={active ? 2.2 : 1.8} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AppHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  const current = ITEMS.find((i) => isActivePath(pathname, i.href));
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="text-[26px] font-bold tracking-[-0.025em] text-ink md:text-[30px]">
        {current ? t[current.key] : t.app_name}
      </h1>
    </header>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
