"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  Moon,
  Sun,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  AlarmClockCheck,
  CalendarPlus2,
  Clock,
  Target,
  Zap,
} from "lucide-react";
import { toggleHabitCompletion } from "@/app/actions/habits";
import { startSleep, endSleep } from "@/app/actions/sleep";
import { moveTaskToDate } from "@/app/actions/tasks";
import { sleepStatus } from "@/lib/sleep";
import { formatDuration } from "@/lib/dates";
import { useI18n } from "./i18n-provider";
import { useToast } from "./toast";
import { useReward } from "./reward";
import { ScoreRing, EmptyState, Badge } from "./ui";
import { QuickAdd, TaskItem } from "./tasks/task-list";
import { TaskForm, resolveTitle, type TaskDto } from "./tasks/task-form";
import { cn } from "@/lib/cn";

export interface TodayHabit {
  id: string;
  name: string;
  doneToday: boolean;
}

export interface TodaySleepInfo {
  last: { durationMinutes: number | null; targetMinutes: number; startedAt: string; endedAt: string | null } | null;
  active: { startedAt: string } | null;
  targetBedtime: string | null;
  targetWake: string | null;
}

export interface FocusState {
  session: {
    id: string;
    title: string;
    taskTitle: string | null;
    taskId: string | null;
    plannedStart: string;
    plannedEnd: string;
  } | null;
  taskOptions: { id: string; title: string }[];
  tomorrow: string;
}

export function TodayView({
  name,
  greeting,
  dateHuman,
  today,
  tz,
  tasks,
  overdue,
  goals,
  habits,
  score,
  doneCount,
  totalCount,
  brain,
  sleep,
  focus,
}: {
  name: string;
  greeting: string;
  dateHuman: string;
  today: string;
  tz: string;
  tasks: TaskDto[];
  overdue: TaskDto[];
  goals: { id: string; name: string }[];
  habits: TodayHabit[];
  score: number | null;
  doneCount: number;
  totalCount: number;
  brain: string[];
  sleep: TodaySleepInfo;
  focus: FocusState;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { celebrate } = useReward();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reviewOpen, setReviewOpen] = useState(false);

  const pendingTasks = tasks.filter((x) => x.status !== "completed");
  const doneTasks = tasks.filter((x) => x.status === "completed");
  const priorities = pendingTasks.filter((x) => x.priority === "high");
  const completedHabits = habits.filter((h) => h.doneToday).length;

  // Sort tasks by startTime for TimeFlow timeline
  const timelineTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [tasks]);

  const toggleHabit = (habitId: string) => {
    startTransition(async () => {
      const res = await toggleHabitCompletion(habitId, today);
      if (res.ok) {
        celebrate(res.unlocked);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const onStartSleep = () => {
    startTransition(async () => {
      const res = await startSleep();
      if (res.ok) {
        if (res.extra?.alreadyActive) toast.push(t.session_active_hint, "info");
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const onEndSleep = () => {
    startTransition(async () => {
      const res = await endSleep();
      if (res.ok) {
        celebrate(res.unlocked);
        toast.push(t.toast_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const moveToTomorrow = (taskId: string) => {
    startTransition(async () => {
      const res = await moveTaskToDate(taskId, focus.tomorrow);
      if (res.ok) {
        toast.push(t.toast_moved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const sleepInfo = useMemo(() => {
    if (sleep.active) return { kind: "active" as const };
    if (!sleep.last || sleep.last.durationMinutes == null) return { kind: "none" as const };
    const status = sleepStatus(sleep.last.durationMinutes, sleep.last.targetMinutes);
    return { kind: "done" as const, status, minutes: sleep.last.durationMinutes, target: sleep.last.targetMinutes };
  }, [sleep]);

  const brainText: Record<string, string> = {
    brain_overdue: t.brain_overdue,
    brain_too_many: t.brain_too_many,
    brain_sleep_schedule: t.brain_sleep_schedule,
    brain_light_day: t.brain_light_day,
  };

  const nowHour = new Date().getHours();
  const nowTime = `${String(nowHour).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">
            {greeting}, {name}
          </h1>
          <p className="mt-1 text-[14px] font-medium text-ink-3">{dateHuman}</p>
        </div>
        <ScoreRing value={score} label={t.day_score} />
      </header>

      {/* ── Quick Add ── */}
      <QuickAdd date={today} />

      {/* ── Brain recommendations ── */}
      {brain.length > 0 && (
        <div className="card flex items-start gap-3 p-4 animate-rise">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-warning-bg text-warning">
            <Sparkles size={15} />
          </div>
          <p className="text-[13px] leading-relaxed text-ink-2">
            <span className="mr-1 font-semibold text-ink">{t.brain_title}</span>
            {brain.map((key) => brainText[key]).filter(Boolean).join(" ")}
          </p>
        </div>
      )}

      {/* ══════════════ TimeFlow Timeline ══════════════ */}
      <section className="card overflow-hidden animate-rise">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-accent" />
            <h2 className="text-[14px] font-bold tracking-[-0.01em]">TimeFlow</h2>
          </div>
          <span className="text-[12px] font-semibold tabular-nums text-ink-3">
            {doneCount}/{totalCount} · {t.stats_done}
          </span>
        </div>

        <div className="relative px-5 py-4">
          {/* vertical timeline line */}
          {timelineTasks.length > 0 && <div className="tf-timeline-line" />}

          {/* Overdue tasks */}
          {overdue.length > 0 && (
            <div className="mb-4 ml-10">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-danger">{t.overdue}</p>
              <div className="flex flex-col gap-1">
                {overdue.map((task) => (
                  <TaskItem key={task.id} task={task} today={today} overdue goals={goals} />
                ))}
              </div>
            </div>
          )}

          {/* Timeline items */}
          {timelineTasks.length === 0 && overdue.length === 0 ? (
            <EmptyState
              icon={<Clock size={20} />}
              title={t.empty_tasks_title}
              sub={t.empty_tasks_sub}
            />
          ) : (
            <div className="flex flex-col gap-1">
              {timelineTasks.map((task) => {
                const isNow = task.startTime && task.startTime <= nowTime && task.status !== "completed";
                const isPast = task.startTime && task.startTime < nowTime && task.status === "completed";
                return (
                  <div key={task.id} className="relative flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className="relative z-10 mt-3 flex h-10 w-10 shrink-0 items-center justify-center">
                      {isNow ? (
                        <div className="tf-now-dot" />
                      ) : (
                        <div className={cn(
                          "h-3 w-3 rounded-full border-2",
                          task.status === "completed"
                            ? "border-success bg-success"
                            : "border-line-strong bg-raised"
                        )} />
                      )}
                    </div>
                    {/* Time label */}
                    <div className="mt-2.5 w-[52px] shrink-0 text-right">
                      <span className={cn(
                        "text-[12px] font-semibold tabular-nums",
                        isNow ? "text-accent" : "text-ink-3"
                      )}>
                        {task.startTime ?? "—"}
                      </span>
                    </div>
                    {/* Task card */}
                    <div className="min-w-0 flex-1 pb-1">
                      <TaskItem task={task} today={today} goals={goals} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Two-column: Habits + Sleep ── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Habits */}
        <section className="card p-5 animate-rise">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">
              <Target size={14} /> {t.habits_today}
            </h2>
            <Link href="/plan" className="text-[12px] font-semibold text-ink-3 hover:text-ink">{t.see_all}</Link>
          </div>
          {habits.length === 0 ? (
            <p className="py-4 text-[13px] text-ink-3">{t.habits_empty}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {habits.map((h) => (
                <button
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  disabled={pending}
                  aria-pressed={h.doneToday}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.98]",
                    h.doneToday ? "border-success/30 bg-success-bg/60" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border-[1.6px] transition-all",
                    h.doneToday ? "border-success bg-success text-white" : "border-line-strong text-transparent",
                  )}>
                    <CheckCircle2 size={13} strokeWidth={3} />
                  </span>
                  <span className={cn("text-[14px] font-medium", h.doneToday && "text-ink-2 line-through decoration-ink-3/40")}>
                    {resolveTitle(h.name, t as unknown as Record<string, string>)}
                  </span>
                </button>
              ))}
              <p className="mt-1 text-right text-[11.5px] tabular-nums text-ink-3">
                {completedHabits}/{habits.length}
              </p>
            </div>
          )}
        </section>

        {/* Sleep mini */}
        <section className="card p-5 animate-rise">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">
              <Moon size={14} /> {t.sleep_card}
            </h2>
            <Link href="/sleep" className="text-[12px] font-semibold text-ink-3 hover:text-ink">{t.see_all}</Link>
          </div>

          {sleepInfo.kind === "active" ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                </span>
                <span className="text-[14px] font-semibold">{t.sleeping_now}</span>
              </div>
              <button
                onClick={onEndSleep}
                disabled={pending}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-accent text-[13.5px] font-semibold text-accent-ink transition-all hover:brightness-110 active:scale-[0.97]"
              >
                <AlarmClockCheck size={16} /> {t.woke_up}
              </button>
            </div>
          ) : sleepInfo.kind === "done" ? (
            <div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[24px] font-bold tabular-nums tracking-[-0.02em]">
                    {formatDuration(sleepInfo.minutes)}
                  </p>
                  <p className="text-[12px] text-ink-3">{t.col_target}: {formatDuration(sleepInfo.target)}</p>
                </div>
                <Badge tone={sleepInfo.status === "green" ? "success" : sleepInfo.status === "yellow" ? "warning" : "danger"}>
                  {sleepInfo.status === "green" ? t.status_green : sleepInfo.status === "yellow" ? t.status_yellow : t.status_red}
                </Badge>
              </div>
              <button
                onClick={onStartSleep}
                disabled={pending}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-raised text-[13.5px] font-medium text-ink transition-all hover:border-line-strong active:scale-[0.97]"
              >
                <Moon size={15} /> {t.start_sleep}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[13px] text-ink-3">{t.no_sleep_yet}</p>
              <button
                onClick={onStartSleep}
                disabled={pending}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-raised text-[13.5px] font-medium text-ink transition-all hover:border-line-strong active:scale-[0.97]"
              >
                <Moon size={15} /> {t.start_sleep}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── End-of-day review ── */}
      {(doneCount > 0 || pendingTasks.length > 0) && (
        <section className="card overflow-hidden animate-rise">
          <button
            onClick={() => setReviewOpen((v) => !v)}
            aria-expanded={reviewOpen}
            className="flex w-full items-center justify-between p-5"
          >
            <h2 className="text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.review_title}</h2>
            <div className="flex items-center gap-3 text-[12px] font-semibold text-ink-3">
              <span className="text-success">{doneCount} {t.stats_done}</span>
              <span>{pendingTasks.length} {t.stats_left}</span>
              <ChevronDown size={15} className={cn("transition-transform", reviewOpen && "rotate-180")} />
            </div>
          </button>
          {reviewOpen && (
            <div className="border-t border-line px-5 py-4 animate-rise">
              {doneTasks.length > 0 && (
                <div className="mb-4">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-success">{t.review_done}</p>
                  <ul className="flex flex-col gap-1 text-[13.5px] text-ink-2">
                    {doneTasks.map((x) => (
                      <li key={x.id} className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-success" />
                        <span className="line-through decoration-ink-3/40">{resolveTitle(x.title, t as unknown as Record<string, string>)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pendingTasks.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">{t.review_left}</p>
                  <ul className="flex flex-col gap-1.5">
                    {pendingTasks.map((x) => (
                      <li key={x.id} className="flex items-center justify-between gap-2 rounded-xl bg-sunken/60 px-3 py-2">
                        <span className="text-[13.5px] text-ink">{resolveTitle(x.title, t as unknown as Record<string, string>)}</span>
                        <button
                          onClick={() => moveToTomorrow(x.id)}
                          disabled={pending}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-2 hover:border-line-strong hover:text-ink"
                        >
                          <CalendarPlus2 size={11.5} /> {t.tomorrow}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
