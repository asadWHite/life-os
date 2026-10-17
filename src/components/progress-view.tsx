"use client";

import {
  Flame,
  CalendarCheck,
  Moon,
  Footprints,
  Zap,
  MoonStar,
  Target,
  Lamp,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "./i18n-provider";
import { EmptyState } from "./ui";
import { formatDuration } from "@/lib/dates";
import { formatDateHuman } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { WeekPoint } from "@/lib/stats";

const ACH_ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  zap: Zap,
  "calendar-check": CalendarCheck,
  "moon-star": MoonStar,
  target: Target,
  lamp: Lamp,
};

interface AchievementItem {
  code: string;
  icon: string;
  nameKey: string;
  descKey: string;
  unlockedAt: string | null;
}

export function ProgressView({
  today,
  week,
  weekCompletion,
  weekTasksDone,
  weekTasksTotal,
  habitConsistency,
  sleepSeries,
  sleepTarget,
  sleepAvg,
  activeDays14,
  streakCurrent,
  streakBest,
  hasAnyData,
  achievements,
}: {
  today: string;
  week: WeekPoint[];
  weekCompletion: number | null;
  weekTasksDone: number;
  weekTasksTotal: number;
  habitConsistency: number | null;
  sleepSeries: { date: string; minutes: number }[];
  sleepTarget: number;
  sleepAvg: number | null;
  activeDays14: number;
  streakCurrent: number;
  streakBest: number;
  hasAnyData: boolean;
  achievements: AchievementItem[];
}) {
  const { t, ts, locale } = useI18n();
  const weekdayName = (d: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

  const maxSleepAxis = Math.max(sleepTarget, ...sleepSeries.map((s) => s.minutes), 60);

  return (
    <div className="flex flex-col gap-5">
      {!hasAnyData ? (
        <section className="card p-8 animate-rise">
          <EmptyState icon={<TrendingUp size={22} />} title={t.no_data_yet} sub={t.no_data_sub} />
        </section>
      ) : (
        <>
          {/* stat cards */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={t.streak_current} value={`${streakCurrent}`} unit={t.days_unit} icon={<Flame size={16} />} accent />
            <StatCard label={t.streak_best} value={`${streakBest}`} unit={t.days_unit} icon={<Zap size={16} />} />
            <StatCard label={t.active_days} value={`${activeDays14}`} unit={t.days_unit} icon={<CalendarCheck size={16} />} />
            <StatCard
              label={t.sleep_avg}
              value={sleepAvg != null ? formatDuration(sleepAvg) : "—"}
              icon={<Moon size={16} />}
            />
          </section>
          <p className="-mt-2 px-1 text-[11.5px] leading-relaxed text-ink-3">{t.streak_rule}</p>

          {/* weekly completion */}
          <section className="card p-5 animate-rise">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.week_overview}</h2>
              <span className="text-[13px] font-semibold tabular-nums text-ink">
                {weekCompletion == null ? "—" : `${Math.round(weekCompletion * 100)}%`}{" "}
                <span className="text-[11px] font-medium text-ink-3">{t.completion_week}</span>
              </span>
            </div>
            <div role="img" aria-label={`${t.completion_week}: ${weekCompletion == null ? "—" : Math.round(weekCompletion * 100) + "%"}`} className="flex h-36 items-end justify-between gap-2 sm:gap-3">
              {week.map((d) => {
                const pct = d.score == null ? 0 : d.score;
                const isToday = d.date === today;
                return (
                  <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-[10px] font-semibold tabular-nums text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">
                      {d.score == null ? "·" : `${Math.round(pct * 100)}%`}
                    </span>
                    <div className="relative flex h-[92px] w-full max-w-[44px] items-end overflow-hidden rounded-full bg-sunken/80">
                      <div
                        className={cn(
                          "w-full rounded-full transition-all duration-700 ease-out",
                          isToday ? "bg-accent" : "bg-accent/45 group-hover:bg-accent/70",
                        )}
                        style={{ height: `${Math.max(4, pct * 100)}%` }}
                      />
                    </div>
                    <span className={cn("text-[10.5px] font-bold uppercase", isToday ? "text-ink" : "text-ink-3")}>
                      {weekdayName(d.date)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div className="text-[12.5px] text-ink-3">
                {t.tasks_done_week}:{" "}
                <span className="font-bold tabular-nums text-ink">
                  {weekTasksDone}/{weekTasksTotal}
                </span>
              </div>
              <div className="text-right text-[12.5px] text-ink-3">
                {t.habits_consistency}:{" "}
                <span className="font-bold tabular-nums text-ink">
                  {habitConsistency == null ? "—" : `${Math.round(habitConsistency * 100)}%`}
                </span>
              </div>
            </div>
          </section>

          {/* sleep trend */}
          <section className="card p-5 animate-rise">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.sleep_trend}</h2>
              <span className="text-[11.5px] tabular-nums text-ink-3">
                {t.col_target}: {formatDuration(sleepTarget)}
              </span>
            </div>
            {sleepSeries.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-3">{t.empty_sleep_chart}</p>
            ) : (
              <div className="relative h-40">
                {/* target line */}
                <div
                  className="absolute inset-x-0 border-t border-dashed border-line-strong"
                  style={{ bottom: `${(sleepTarget / maxSleepAxis) * 100}%` }}
                />
                <div className="flex h-full items-end justify-between gap-1.5">
                  {sleepSeries.map((s, i) => {
                    const good = s.minutes >= sleepTarget;
                    const low = s.minutes < 120;
                    return (
                      <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                        <span className="text-[9px] font-semibold tabular-nums text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">
                          {formatDuration(s.minutes)}
                        </span>
                        <div
                          role="img"
                          aria-label={formatDuration(s.minutes)}
                          className={cn(
                            "w-full max-w-[26px] rounded-t-lg transition-all duration-500",
                            low ? "bg-danger/70" : good ? "bg-success/75" : "bg-warning/70",
                          )}
                          style={{ height: `${(s.minutes / maxSleepAxis) * 100}%` }}
                        />
                        <span className="text-[9px] tabular-nums text-ink-3">
                          {new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(new Date(s.date))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* achievements */}
      <section className="card p-5 animate-rise">
        <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.achievements_title}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements.map((a) => {
            const Icon = ACH_ICONS[a.icon] ?? Target;
            const unlocked = !!a.unlockedAt;
            return (
              <div
                key={a.code}
                className={cn(
                  "group relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-200",
                  unlocked
                    ? "border-line bg-raised shadow-sm"
                    : "border-dashed border-line bg-sunken/40 opacity-60",
                )}
                title={ts(a.descKey as keyof Dict)}
              >
                <div
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-full transition-all",
                    unlocked ? "bg-accent text-accent-ink" : "bg-sunken text-ink-3",
                  )}
                >
                  <Icon size={19} strokeWidth={1.9} />
                </div>
                <p className="mt-2.5 text-[11.5px] font-bold leading-tight">{ts(a.nameKey as keyof Dict)}</p>
                <p className="mt-1 text-[10px] leading-snug text-ink-3">
                  {unlocked && a.unlockedAt
                    ? `${t.unlocked_on} ${formatDateHuman(a.unlockedAt.slice(0, 10), locale)}`
                    : t.achievements_locked}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cn("card p-4 animate-rise", accent && "border-accent/25")}>
      <div className="flex items-center gap-2 text-ink-3">
        {icon}
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em]">{label}</span>
      </div>
      <p className="mt-2 text-[24px] font-bold tabular-nums tracking-[-0.02em] text-ink">
        {value}
        {unit && <span className="ml-1 text-[12px] font-semibold text-ink-3">{unit}</span>}
      </p>
    </div>
  );
}
