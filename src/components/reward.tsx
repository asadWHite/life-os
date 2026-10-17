"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Footprints, Flame, Zap, CalendarCheck, MoonStar, Target, Lamp, type LucideIcon } from "lucide-react";
import type { AchievementDef } from "@/lib/achievements";
import { useI18n } from "./i18n-provider";
import type { Dict } from "@/lib/i18n/dictionaries";

const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  zap: Zap,
  "calendar-check": CalendarCheck,
  "moon-star": MoonStar,
  target: Target,
  lamp: Lamp,
};

type Unlock = Pick<AchievementDef, "code" | "icon" | "nameKey" | "descKey">;

const Ctx = createContext<{ celebrate: (items: Unlock[] | undefined) => void } | null>(null);

export function useReward() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useReward must be used within RewardProvider");
  return ctx;
}

function RewardDialog({ items, onClose }: { items: Unlock[]; onClose: () => void }) {
  const { t, ts } = useI18n();
  const item = items[0];
  if (!item) return null;
  const Icon = ICONS[item.icon] ?? Target;
  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[8px]" />
      <div className="glass relative w-full max-w-[340px] rounded-[1.75rem] p-8 text-center animate-scale-in">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
          <Icon size={34} strokeWidth={1.75} />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">{t.ach_unlocked_title}</p>
        <h2 className="mt-1.5 text-[21px] font-bold tracking-[-0.02em] text-ink">
          {ts(item.nameKey as keyof Dict)}
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{ts(item.descKey as keyof Dict)}</p>
        <button
          onClick={onClose}
          className="mt-6 h-10 w-full rounded-full bg-accent text-[13.5px] font-semibold text-accent-ink transition-transform active:scale-[0.97]"
        >
          {t.close}
        </button>
        {items.length > 1 && (
          <p className="mt-2.5 text-[12px] text-ink-3">+{items.length - 1}</p>
        )}
      </div>
    </div>
  );
}

export function RewardProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Unlock[]>([]);
  const celebrate = useCallback((items: Unlock[] | undefined) => {
    if (items?.length) setQueue((prev) => [...prev, ...items]);
  }, []);
  return (
    <Ctx.Provider value={{ celebrate }}>
      {children}
      {queue.length > 0 && <RewardDialog items={queue} onClose={() => setQueue([])} />}
    </Ctx.Provider>
  );
}
