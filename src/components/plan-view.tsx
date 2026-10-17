"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Repeat, Target, Trash2, CheckCircle2, Check } from "lucide-react";
import { createHabit, deleteHabit, toggleHabitCompletion } from "@/app/actions/habits";
import { createGoal, setGoalStatus, deleteGoal } from "@/app/actions/goals";
import { useI18n } from "./i18n-provider";
import { useToast } from "./toast";
import { useReward } from "./reward";
import { Button, Chip, EmptyState, Field, Input, Modal, Textarea } from "./ui";
import { TaskItem, QuickAdd } from "./tasks/task-list";
import { resolveTitle, type TaskDto } from "./tasks/task-form";
import { cn } from "@/lib/cn";

interface HabitDto {
  id: string;
  name: string;
  description: string;
  frequency: string;
  targetPerWeek: number;
  weekCount: number;
  doneOnSelected: boolean;
}

interface GoalDto {
  id: string;
  name: string;
  description: string;
  status: string;
  targetDate: string | null;
  linkedTotal: number;
  linkedDone: number;
}

export function PlanView({
  today,
  selected,
  weekDates,
  railCounts,
  tasks,
  habits,
  goals,
}: {
  today: string;
  selected: string;
  weekDates: string[];
  railCounts: Record<string, number>;
  tasks: TaskDto[];
  habits: HabitDto[];
  goals: GoalDto[];
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { celebrate } = useReward();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [habitOpen, setHabitOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const go = (date: string) => router.push(`/plan?date=${date}`);
  const shift = (days: number) => {
    const d = new Date(selected + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    go(d.toISOString().slice(0, 10));
  };

  const dayName = (d: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  const dayNum = (d: string) => Number(d.slice(8));
  const humanSelected = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(selected + "T12:00:00Z"));

  const toggleHabit = (id: string) =>
    startTransition(async () => {
      const res = await toggleHabitCompletion(id, selected);
      if (res.ok) {
        celebrate(res.unlocked);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });

  const onDeleteHabit = (id: string) =>
    startTransition(async () => {
      const res = await deleteHabit(id);
      if (res.ok) router.refresh();
      else toast.push(t.toast_error, "error");
    });

  const onCreateHabit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createHabit({
        name: String(fd.get("name") ?? "").trim(),
        description: "",
        frequency: fd.get("frequency") === "weekly" ? "weekly" : "daily",
        targetPerWeek: Number(fd.get("targetPerWeek") ?? 7) || 7,
      });
      if (res.ok) {
        setHabitOpen(false);
        toast.push(t.toast_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const onCreateGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createGoal({
        name: String(fd.get("name") ?? "").trim(),
        description: String(fd.get("description") ?? ""),
        targetDate: String(fd.get("targetDate") || "") || null,
      });
      if (res.ok) {
        setGoalOpen(false);
        toast.push(t.toast_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const onCompleteGoal = (id: string) =>
    startTransition(async () => {
      const res = await setGoalStatus(id, "completed");
      if (res.ok) {
        celebrate(res.unlocked);
        toast.push(t.toast_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });

  return (
    <div className="flex flex-col gap-5">
      {/* week rail */}
      <section className="glass sticky top-3 z-30 rounded-2xl p-2.5">
        <div className="flex items-center justify-between gap-1">
          <button onClick={() => shift(-7)} aria-label={t.prev_week} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink">
            <ChevronLeft size={17} />
          </button>
          <div className="flex flex-1 items-center justify-between gap-1">
            {weekDates.map((d) => {
              const isSel = d === selected;
              const isToday = d === today;
              const count = railCounts[d] ?? 0;
              return (
                <button
                  key={d}
                  onClick={() => go(d)}
                  aria-current={isSel ? "date" : undefined}
                  className={cn(
                    "relative flex h-[52px] flex-1 flex-col items-center justify-center rounded-xl transition-all",
                    isSel ? "bg-accent text-accent-ink shadow-[0_6px_16px_rgba(0,0,0,0.18)]" : "hover:bg-sunken",
                  )}
                >
                  <span className={cn("text-[10px] font-bold uppercase", isSel ? "opacity-80" : "text-ink-3")}>{dayName(d)}</span>
                  <span className={cn("text-[15px] font-bold tabular-nums leading-tight", !isSel && isToday && "text-accent")}>{dayNum(d)}</span>
                  {count > 0 && (
                    <span className={cn("absolute bottom-1.5 h-1 w-1 rounded-full", isSel ? "bg-accent-ink/70" : "bg-accent/60")} />
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={() => shift(7)} aria-label={t.next_week} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink">
            <ChevronRight size={17} />
          </button>
        </div>
      </section>

      {/* selected day */}
      <section className="card p-5 animate-rise">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold capitalize tracking-[-0.01em]">{humanSelected}</h2>
          {selected !== today && (
            <Button size="sm" variant="ghost" onClick={() => go(today)}>
              {t.today}
            </Button>
          )}
        </div>
        <QuickAdd date={selected} />
        <div className="mt-3 flex flex-col divide-y divide-line/60">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-3">{t.plan_empty_day}</p>
          ) : (
            tasks.map((task) => (
              <TaskItem key={task.id} task={task} today={today} overdue={task.dueDate < today && task.status !== "completed"} goals={goals} />
            ))
          )}
        </div>
      </section>

      {/* habits */}
      <section className="card p-5 animate-rise">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">
            <Repeat size={14} /> {t.habits_title}
          </h2>
          <Button size="sm" variant="secondary" onClick={() => setHabitOpen(true)}>
            <Plus size={14} /> {t.habit_new}
          </Button>
        </div>
        {habits.length === 0 ? (
          <EmptyState icon={<Repeat size={20} />} title={t.habit_empty} />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {habits.map((h) => {
                const pct = Math.min(1, h.weekCount / h.targetPerWeek);
                return (
                  <div key={h.id} className="group flex items-center gap-3 rounded-2xl border border-line p-3.5">
                    <button
                      onClick={() => toggleHabit(h.id)}
                      disabled={pending}
                      aria-pressed={h.doneOnSelected}
                      aria-label={h.name}
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.6px] transition-all active:scale-90",
                        h.doneOnSelected ? "border-success bg-success text-white" : "border-line-strong text-transparent hover:border-accent",
                      )}
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{resolveTitle(h.name, t as unknown as Record<string, string>)}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-sunken">
                          <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${pct * 100}%` }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-ink-3">
                          {h.weekCount}/{h.targetPerWeek} {t.habit_week_progress}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-sunken px-2.5 py-1 text-[10.5px] font-semibold text-ink-3">
                      {h.frequency === "daily" ? t.freq_daily : t.freq_weekly}
                    </span>
                    <button
                      onClick={() => onDeleteHabit(h.id)}
                      aria-label={t.delete}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 opacity-0 transition-all hover:bg-danger-bg hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 size={14.5} />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11.5px] text-ink-3">{t.recurring_note}</p>
          </>
        )}
      </section>

      {/* goals */}
      <section className="card p-5 animate-rise">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">
            <Target size={14} /> {t.goals_title}
          </h2>
          <Button size="sm" variant="secondary" onClick={() => setGoalOpen(true)}>
            <Plus size={14} /> {t.goal_new}
          </Button>
        </div>
        {goals.length === 0 ? (
          <EmptyState icon={<Target size={20} />} title={t.goal_empty} />
        ) : (
          <div className="flex flex-col gap-2.5">
            {goals.map((g) => {
              const pct = g.linkedTotal === 0 ? null : g.linkedDone / g.linkedTotal;
              const completed = g.status === "completed";
              return (
                <div key={g.id} className={cn("group rounded-2xl border border-line p-4", completed && "opacity-70")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn("text-[14.5px] font-semibold", completed && "line-through decoration-ink-3/50")}>{g.name}</p>
                      {g.description && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-3">{g.description}</p>}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold",
                        completed ? "bg-success-bg text-success" : "bg-sunken text-ink-3",
                      )}
                    >
                      {completed ? t.goal_status_completed : t.goal_status_active}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
                      {pct != null ? (
                        <>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-sunken">
                            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct * 100}%` }} />
                          </div>
                          <span className="tabular-nums">
                            {g.linkedDone}/{g.linkedTotal} {t.goal_progress}
                          </span>
                        </>
                      ) : (
                        <span>{t.goal_progress}: 0</span>
                      )}
                      {g.targetDate && <span>· {g.targetDate}</span>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!completed && (
                        <button
                          onClick={() => onCompleteGoal(g.id)}
                          title={t.goal_complete_cta}
                          aria-label={t.goal_complete_cta}
                          className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-success-bg hover:text-success"
                        >
                          <CheckCircle2 size={15.5} />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            await deleteGoal(g.id);
                            router.refresh();
                          })
                        }
                        title={t.delete}
                        aria-label={t.delete}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-danger-bg hover:text-danger"
                      >
                        <Trash2 size={14.5} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* habit modal */}
      <Modal open={habitOpen} onClose={() => setHabitOpen(false)} title={t.habit_new}>
        <form onSubmit={onCreateHabit} className="flex flex-col gap-4">
          <Field label={t.habit_name}>
            <Input name="name" required maxLength={120} autoFocus />
          </Field>
          <Field label={t.habit_freq}>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input type="radio" name="frequency" value="daily" defaultChecked className="peer sr-only" />
                <span className="inline-block rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 transition-all peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink">
                  {t.freq_daily}
                </span>
              </label>
              <label className="cursor-pointer">
                <input type="radio" name="frequency" value="weekly" className="peer sr-only" />
                <span className="inline-block rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 transition-all peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink">
                  {t.freq_weekly}
                </span>
              </label>
            </div>
          </Field>
          <Field label={t.habit_target_week}>
            <Input name="targetPerWeek" type="number" min={1} max={7} defaultValue={7} inputMode="numeric" />
          </Field>
          <Button type="submit" variant="primary" busy={pending} className="w-full">
            {t.create}
          </Button>
        </form>
      </Modal>

      {/* goal modal */}
      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title={t.goal_new}>
        <form onSubmit={onCreateGoal} className="flex flex-col gap-4">
          <Field label={t.goal_name}>
            <Input name="name" required maxLength={120} autoFocus />
          </Field>
          <Field label={t.goal_desc} hint={t.optional}>
            <Textarea name="description" maxLength={1000} />
          </Field>
          <Field label={t.goal_target_date} hint={t.optional}>
            <Input name="targetDate" type="date" />
          </Field>
          <Button type="submit" variant="primary" busy={pending} className="w-full">
            {t.create}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
