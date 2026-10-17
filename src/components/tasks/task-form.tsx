"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask, updateTask } from "@/app/actions/tasks";
import { useI18n } from "../i18n-provider";
import { useToast } from "../toast";
import { Button, Field, Input, Modal, Select, Textarea } from "../ui";

export interface TaskDto {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  startTime: string | null;
  reminderMinutes: number | null;
  goalId: string | null;
  suggested: boolean;
}

export function resolveTitle(title: string, t: Record<string, string>): string {
  if (title.startsWith("i18n:")) {
    const key = title.slice(5);
    return t[key] ?? key;
  }
  return title;
}

export function TaskForm({
  open,
  onClose,
  task,
  defaultDate,
  goals,
}: {
  open: boolean;
  onClose: () => void;
  task: TaskDto | null; // null → create
  defaultDate: string;
  goals: { id: string; name: string }[];
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? ""),
      priority: String(fd.get("priority") ?? "normal") as "low" | "normal" | "high",
      dueDate: String(fd.get("dueDate")),
      startTime: String(fd.get("startTime") || "") || null,
      reminderMinutes: fd.get("reminderMinutes") === "" || fd.get("reminderMinutes") == null ? null : Number(fd.get("reminderMinutes")),
      goalId: String(fd.get("goalId") || "") || null,
    };
    if (!payload.title) return;
    startTransition(async () => {
      const res = task ? await updateTask(task.id, payload) : await createTask(payload);
      if (res.ok) {
        toast.push(task ? t.toast_task_updated : t.toast_task_added);
        onClose();
        router.refresh();
      } else {
        toast.push(t.toast_error, "error");
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? t.task_edit : t.task_new}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t.task_title_label}>
          <Input name="title" required maxLength={200} defaultValue={task?.title ?? ""} autoFocus />
        </Field>
        <Field label={t.task_desc_label} hint={t.optional}>
          <Textarea name="description" maxLength={2000} defaultValue={task?.description ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.task_due_label}>
            <Input type="date" name="dueDate" required defaultValue={task?.dueDate ?? defaultDate} />
          </Field>
          <Field label={t.task_start_label} hint={t.optional}>
            <Input type="time" name="startTime" defaultValue={task?.startTime ?? ""} />
          </Field>
        </div>
        <Field label={t.task_priority_label}>
          <PriorityPicker defaultValue={task?.priority ?? "normal"} labels={{ low: t.priority_low, normal: t.priority_normal, high: t.priority_high }} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.task_reminder_label}>
            <Select
              name="reminderMinutes"
              defaultValue={task?.reminderMinutes == null ? "" : String(task.reminderMinutes)}
              options={[
                { value: "", label: t.reminder_off },
                { value: "0", label: t.reminder_at },
                { value: "15", label: t.reminder_15 },
                { value: "30", label: t.reminder_30 },
                { value: "60", label: t.reminder_60 },
              ]}
            />
          </Field>
          <Field label={t.task_goal_label}>
            <Select
              name="goalId"
              defaultValue={task?.goalId ?? ""}
              options={[{ value: "", label: t.no_goal }, ...goals.map((g) => ({ value: g.id, label: g.name }))]}
            />
          </Field>
        </div>
        <Button type="submit" variant="primary" busy={pending} className="mt-1 w-full">
          {task ? t.save : t.create}
        </Button>
      </form>
    </Modal>
  );
}

/* Radio-based priority picker (Segmented is a controlled widget; radios keep
   the form payload simple and accessible). */
import { useState } from "react";
import { cn } from "@/lib/cn";

function PriorityPicker({
  defaultValue,
  labels,
}: {
  defaultValue: string;
  labels: { low: string; normal: string; high: string };
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="inline-flex rounded-full border border-line bg-sunken p-1 text-[13px]">
      {(["low", "normal", "high"] as const).map((v) => (
        <label key={v} className="cursor-pointer">
          <input
            type="radio"
            name="priority"
            value={v}
            checked={value === v}
            onChange={() => setValue(v)}
            className="sr-only"
          />
          <span
            className={cn(
              "inline-block rounded-full px-3.5 py-1.5 font-medium transition-all",
              value === v ? "bg-raised text-ink shadow-[0_2px_8px_rgba(0,0,0,0.1)]" : "text-ink-3",
            )}
          >
            {labels[v]}
          </span>
        </label>
      ))}
    </div>
  );
}
