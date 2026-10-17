"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Moon, AlarmClockCheck, BellRing, Info, Trash2, MoonStar } from "lucide-react";
import { startSleep, endSleep, saveSleepSchedule, discardSleepSession } from "@/app/actions/sleep";
import { sleepStatus, clockDriftMinutes, consistency } from "@/lib/sleep";
import { formatDuration, scheduledSleepMinutes } from "@/lib/dates";
import { useI18n } from "./i18n-provider";
import { useToast } from "./toast";
import { useReward } from "./reward";
import { Button, Badge, Field, Input, EmptyState } from "./ui";
import { cn } from "@/lib/cn";
import type { Dict } from "@/lib/i18n/dictionaries";

export interface SleepHistoryRow {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  state: string;
}

export function SleepView({
  schedule,
  active,
  history,
  recKeys,
  avgMinutes,
  tz,
  dict,
  locale,
}: {
  schedule: { bedtime: string; wake: string; weekdays: number[]; remindBedtime: boolean; targetMinutes: number };
  active: { startedAt: string } | null;
  history: SleepHistoryRow[];
  recKeys: string[];
  avgMinutes: number | null;
  tz: string;
  dict: Dict;
  locale: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const { celebrate } = useReward();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /* schedule editor state */
  const [bedtime, setBedtime] = useState(schedule.bedtime);
  const [wake, setWake] = useState(schedule.wake);
  const [weekdays, setWeekdays] = useState<number[]>(schedule.weekdays);
  const [remind, setRemind] = useState(schedule.remindBedtime);
  const computedMinutes = scheduledSleepMinutes(bedtime, wake);

  const weekdayNames = useMemo(() => {
    // Mon 1 Jan 2024 → Mon..Sun
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return [1, 2, 3, 4, 5, 6, 0].map((d) => fmt.format(new Date(Date.UTC(2024, 0, d))));
  }, [locale]);

  /* active-session elapsed — derived from timestamps, re-checked each second */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    const onVis = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);
  const elapsed = active ? Math.max(0, Math.round((now - new Date(active.startedAt).getTime()) / 60000)) : 0;

  /* bedtime reminder (works only while the page is open — honest limitation) */
  const notifState = useMemo(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission as "granted" | "denied" | "default";
  }, []);
  useEffect(() => {
    if (!remind || notifState !== "granted") return;
    const [h, m] = bedtime.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
    const timeout = target.getTime() - Date.now();
    if (timeout > 12 * 3600_000) return;
    const id = setTimeout(() => {
      new Notification(t.app_name, { body: `${t.target_bedtime} · ${bedtime}` });
    }, timeout);
    return () => clearTimeout(id);
  }, [remind, notifState, bedtime, t]);

  const saveSchedule = (withReminder = remind) => {
    startTransition(async () => {
      const res = await saveSleepSchedule({
        targetBedtime: bedtime,
        targetWake: wake,
        weekdays,
        remindBedtime: withReminder,
      });
      if (res.ok) {
        toast.push(t.toast_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const enableReminder = async () => {
    if (notifState === "unsupported") {
      toast.push(t.reminders_unsupported, "error");
      return;
    }
    if (notifState === "denied") {
      toast.push(t.reminders_denied, "error");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setRemind(true);
      saveSchedule(true);
      toast.push(t.reminders_on);
    } else {
      toast.push(t.reminders_denied, "error");
    }
  };

  const onStart = () =>
    startTransition(async () => {
      const res = await startSleep();
      if (res.ok) {
        if (res.extra?.alreadyActive) toast.push(t.sleep_dupe_blocked, "info");
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });

  const onEnd = () =>
    startTransition(async () => {
      const res = await endSleep();
      if (res.ok) {
        celebrate(res.unlocked);
        toast.push(t.toast_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });

  const onDiscard = (id: string) =>
    startTransition(async () => {
      const res = await discardSleepSession(id);
      if (res.ok) {
        toast.push(t.toast_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });

  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(new Date(iso));
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: tz }).format(new Date(iso));

  const visibleHistory = history.filter((s) => s.state !== "active");
  const [discardId, setDiscardId] = useState<string | null>(null);

  const statusMeta = (s: SleepHistoryRow) => {
    const status = s.state === "discarded" ? "none" : sleepStatus(s.durationMinutes, schedule.targetMinutes);
    if (s.state === "discarded") return { label: t.status_discarded, tone: "neutral" as const };
    if (status === "green") return { label: t.status_green, tone: "success" as const };
    if (status === "yellow") return { label: t.status_yellow, tone: "warning" as const };
    return { label: t.status_red, tone: "danger" as const };
  };

  return (
    <div className="flex flex-col gap-5">
      {/* session control */}
      <section
        className="relative overflow-hidden rounded-3xl border border-[#262F3C] p-6"
        style={{ background: "linear-gradient(180deg, #151B23 0%, #12171E 100%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: active ? "radial-gradient(420px 200px at 50% 0%, rgba(255,99,60,0.12), transparent 70%)" : undefined }}
        />
        <div className="relative flex flex-col items-center py-4 text-center">
          <div
            className={cn(
              "grid h-16 w-16 place-items-center rounded-2xl transition-colors duration-700",
              active ? "bg-[#FF633C]/15 text-[#FFB16A]" : "bg-[#202833] text-[#66778C]",
            )}
          >
            <MoonStar size={28} />
          </div>
          {active ? (
            <>
              <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[#FFB16A]">{t.sleeping_now}</p>
              <p className="mt-2 text-[40px] font-bold tabular-nums tracking-[-0.03em] text-white">
                {formatDuration(elapsed)}
              </p>
              <p className="text-[12.5px] text-[#66778C]">
                {t.sleeping_since} {fmtTime(active.startedAt)}
              </p>
              <button
                onClick={onEnd}
                disabled={pending}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#FF633C] px-8 text-[14.5px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
              >
                <AlarmClockCheck size={18} /> {t.woke_up}
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[#66778C]">{t.sleep_title}</p>
              <p className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-white">
                {schedule.bedtime} — {schedule.wake}
              </p>
              <p className="text-[12.5px] text-[#66778C]">
                {t.target_duration}: {formatDuration(schedule.targetMinutes)}
                {avgMinutes != null && ` · ${t.sleep_avg}: ${formatDuration(avgMinutes)}`}
              </p>
              <button
                onClick={onStart}
                disabled={pending}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#FF633C] px-8 text-[14.5px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
              >
                <Moon size={17} /> {t.start_sleep}
              </button>
            </>
          )}
        </div>
      </section>

      {/* schedule editor */}
      <section className="card p-5 animate-rise">
        <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.schedule_title}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label={t.target_bedtime}>
            <Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
          </Field>
          <Field label={t.target_wake}>
            <Input type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
          </Field>
          <Field label={t.target_duration}>
            <div className="grid h-[42px] items-center rounded-xl border border-line bg-sunken px-3.5 text-[14px] font-semibold tabular-nums text-ink">
              {formatDuration(computedMinutes)}
            </div>
          </Field>
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t.schedule_days}</span>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((d, i) => {
              const on = weekdays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => setWeekdays((p) => (on ? p.filter((x) => x !== d) : [...p, d]))}
                  aria-pressed={on}
                  className={cn(
                    "grid h-9 min-w-[44px] place-items-center rounded-full px-2 text-[12px] font-semibold transition-all active:scale-95",
                    on ? "bg-accent text-accent-ink" : "border border-line text-ink-3 hover:text-ink",
                  )}
                >
                  {weekdayNames[i]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Button variant="primary" onClick={() => saveSchedule()} busy={pending}>
            {t.save_schedule}
          </Button>
        </div>

        {/* reminders */}
        <div className="mt-5 rounded-2xl border border-line bg-sunken/50 p-4">
          <div className="flex items-start gap-3">
            <BellRing size={16} className="mt-0.5 shrink-0 text-ink-3" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-ink">{t.reminders_title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">{t.reminders_body}</p>
              <div className="mt-3 flex items-center gap-3">
                {remind ? (
                  <Badge tone="success">{t.reminders_on}</Badge>
                ) : (
                  <Button size="sm" variant="secondary" onClick={enableReminder}>
                    {t.reminders_enable}
                  </Button>
                )}
                {notifState === "unsupported" && <Badge tone="warning">{t.reminders_unsupported}</Badge>}
                {notifState === "denied" && !remind && <Badge tone="warning">{t.reminders_denied}</Badge>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* recommendations */}
      <section className="card p-5 animate-rise">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.recs_title}</h2>
        <ul className="flex flex-col gap-2.5">
          {recKeys.map((k) => (
            <li key={k} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
              <Info size={13.5} className="mt-[3px] shrink-0 text-ink-3" />
              {dict[k as keyof Dict] ?? k}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] italic text-ink-3">{t.recs_note}</p>
      </section>

      {/* history */}
      <section className="card p-5 animate-rise">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.history_title}</h2>
        {visibleHistory.length === 0 ? (
          <EmptyState icon={<Moon size={20} />} title={t.history_empty} />
        ) : (
          <div className="flex flex-col divide-y divide-line/60">
            {visibleHistory.map((s) => {
              const meta = statusMeta(s);
              const startLocal = fmtTime(s.startedAt);
              const drift = clockDriftMinutes(startLocal, schedule.bedtime);
              const consist = consistency(drift);
              const diff = (s.durationMinutes ?? 0) - schedule.targetMinutes;
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                  <div className="w-[76px]">
                    <p className="text-[13.5px] font-semibold text-ink">{fmtDate(s.startedAt)}</p>
                    <p className="text-[11.5px] tabular-nums text-ink-3">
                      {startLocal} → {s.endedAt ? fmtTime(s.endedAt) : "…"}
                    </p>
                  </div>
                  <div className="min-w-[86px]">
                    <p className="text-[15px] font-bold tabular-nums text-ink">
                      {s.durationMinutes != null ? formatDuration(s.durationMinutes) : "—"}
                    </p>
                    <p className="text-[11px] tabular-nums text-ink-3">
                      {t.col_diff}: {diff >= 0 ? "+" : ""}
                      {formatDuration(diff)}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {s.state !== "discarded" && (
                      <Badge tone={consist === "on_time" ? "success" : "neutral"}>
                        {consist === "on_time" ? t.bedtime_on : t.bedtime_off}
                      </Badge>
                    )}
                  </div>
                  {s.state !== "discarded" &&
                    (discardId === s.id ? (
                      <div className="flex items-center gap-2 rounded-xl bg-danger-bg px-3 py-1.5 text-[11.5px] text-danger animate-scale-in">
                        <span className="max-w-[220px]">{t.discard_confirm}</span>
                        <button onClick={() => onDiscard(s.id)} className="shrink-0 font-bold hover:underline">
                          {t.confirm}
                        </button>
                        <button onClick={() => setDiscardId(null)} className="shrink-0 font-medium hover:underline">
                          {t.cancel}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDiscardId(s.id)}
                        aria-label={t.discard_record}
                        title={t.discard_record}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-danger-bg hover:text-danger"
                      >
                        <Trash2 size={14.5} />
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
