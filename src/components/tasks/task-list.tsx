"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, Pencil, Plus, Trash2, CalendarPlus2, Flame } from "lucide-react";
import { toggleTask, deleteTask, moveTaskToDate, quickAddTask } from "@/app/actions/tasks";
import { useI18n } from "../i18n-provider";
import { useToast } from "../toast";
import { useReward } from "../reward";
import { cn } from "@/lib/cn";
import { TaskForm, resolveTitle, type TaskDto } from "./task-form";

/* ------------------------------ Quick add ----------------------------- */

export function QuickAdd({ date }: { date: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    startTransition(async () => {
      const res = await quickAddTask(title, date);
      if (res.ok) {
        setValue("");
        toast.push(t.toast_task_added);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  return (
    <form onSubmit={submit} className="glass flex items-center gap-2 rounded-full p-1.5 pl-4">
      <Plus size={17} className="shrink-0 text-ink-3" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t.quick_add_placeholder}
        maxLength={200}
        aria-label={t.task_new}
        className="h-9 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
        aria-label={t.add}
      >
        <Check size={16} strokeWidth={2.5} />
      </button>
    </form>
  );
}

/* ------------------------------ Task item ----------------------------- */

export function TaskItem({
  task,
  today,
  overdue = false,
  goals,
}: {
  task: TaskDto;
  today: string;
  overdue?: boolean;
  goals: { id: string; name: string }[];
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { celebrate } = useReward();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const done = task.status === "completed";
  const title = resolveTitle(task.title, t as unknown as Record<string, string>);

  const onToggle = () => {
    startTransition(async () => {
      const res = await toggleTask(task.id);
      if (res.ok) {
        toast.push(res.extra?.completed ? t.toast_task_completed : t.toast_task_reopened);
        celebrate(res.unlocked);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (res.ok) {
        setConfirmDelete(false);
        toast.push(t.toast_task_deleted);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const move = (date: string) => {
    startTransition(async () => {
      const res = await moveTaskToDate(task.id, date);
      if (res.ok) {
        toast.push(date === today ? t.toast_task_updated : t.toast_moved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const tomorrow = new Date(new Date(today + "T12:00:00Z").getTime() + 86400000).toISOString().slice(0, 10);

  return (
    <div
      className={cn(
        "group card flex items-start gap-3 rounded-2xl !border-transparent p-3.5 pl-3 transition-all duration-200 hover:!border-line",
        done && "opacity-60",
      )}
      style={{ boxShadow: "none", background: "transparent" }}
    >
      <button
        onClick={onToggle}
        disabled={pending}
        aria-label={done ? t.toast_task_reopened : t.toast_task_completed}
        aria-pressed={done}
        className={cn(
          "mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-[1.6px] transition-all duration-200 active:scale-90",
          done
            ? "border-success bg-success text-white"
            : "border-line-strong text-transparent hover:border-accent",
        )}
      >
        <Check size={14} strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "text-[14.5px] font-medium tracking-[-0.005em] text-ink transition-colors",
              done && "line-through decoration-ink-3/60",
            )}
          >
            {title}
          </span>
          {task.priority === "high" && !done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-[10.5px] font-bold text-danger">
              <Flame size={10.5} /> {t.priority_high}
            </span>
          )}
          {task.suggested && (
            <span className="rounded-full bg-sunken px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">
              {t.suggested_badge}
            </span>
          )}
          {overdue && !done && (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10.5px] font-bold text-warning">
              {t.status_overdue}
            </span>
          )}
        </div>
        {(task.startTime || task.description) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-3">
            {task.startTime && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock3 size={11.5} /> {task.startTime}
              </span>
            )}
            {task.description && <span className="line-clamp-1">{task.description}</span>}
          </div>
        )}
        {confirmDelete && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-danger-bg px-3 py-2 text-[12px] text-danger animate-scale-in">
            <span className="flex-1">{t.delete_confirm_task}</span>
            <button onClick={onDelete} disabled={pending} className="font-bold hover:underline">
              {t.delete}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="font-medium hover:underline">
              {t.cancel}
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {overdue && !done && (
          <button
            onClick={() => move(today)}
            title={t.today}
            aria-label={t.today}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <CalendarPlus2 size={15} />
          </button>
        )}
        {!overdue && !done && task.dueDate === today && (
          <button
            onClick={() => move(tomorrow)}
            title={t.move_to_tomorrow}
            aria-label={t.move_to_tomorrow}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <CalendarPlus2 size={15} />
          </button>
        )}
        <button
          onClick={() => setEditOpen(true)}
          aria-label={t.edit}
          className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          aria-label={t.delete}
          className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-danger-bg hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <TaskForm open={editOpen} onClose={() => setEditOpen(false)} task={task} defaultDate={today} goals={goals} />
    </div>
  );
}
