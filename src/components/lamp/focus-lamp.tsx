"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Power, X } from "lucide-react";
import { scheduleFocus, endFocus, cancelFocus } from "@/app/actions/focus";
import { useI18n } from "../i18n-provider";
import { useToast } from "../toast";
import { Button, Field, Input, Modal, Select } from "../ui";
import { LampArt } from "./lamp-art";

export interface FocusSessionDto {
  id: string;
  title: string;
  taskTitle: string | null;
  taskId: string | null;
  plannedStart: string; // ISO
  plannedEnd: string; // ISO
}

export interface FocusTaskOption {
  id: string;
  title: string;
}

export function FocusLamp({
  session,
  taskOptions,
  today,
  tz,
}: {
  session: FocusSessionDto | null;
  taskOptions: FocusTaskOption[];
  today: string; // YYYY-MM-DD in user tz
  tz: string;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();

  /* The lamp's state is *derived* — now vs stored schedule — and merely
     re-checked on a cadence + whenever the tab becomes visible again.
     No accumulated interval state, safe across refreshes. */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const start = session ? new Date(session.plannedStart) : null;
  const end = session ? new Date(session.plannedEnd) : null;
  const active = !!session && !!start && !!end && now >= start && now <= end;
  const upcoming = !!session && !!start && now < start;

  const [modalOpen, setModalOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const fmtTime = (d: Date) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(d);
  const fmtDay = (d: Date) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: tz }).format(d);

  const onSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const taskId = String(fd.get("taskId") || "");
    const selected = taskOptions.find((o) => o.id === taskId);
    startTransition(async () => {
      const res = await scheduleFocus({
        title: selected ? selected.title : String(fd.get("title") || t.focus_free_label),
        taskId: taskId || null,
        date: String(fd.get("date")),
        from: String(fd.get("from")),
        to: String(fd.get("to")),
      });
      if (res.ok) {
        setModalOpen(false);
        toast.push(t.toast_saved);
        router.refresh();
      } else {
        toast.push(t.toast_error, "error");
      }
    });
  };

  const onEnd = () => {
    if (!session) return;
    startTransition(async () => {
      const res = await endFocus(session.id);
      if (res.ok) {
        toast.push(t.toast_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  const onCancel = () => {
    if (!session) return;
    startTransition(async () => {
      const res = await cancelFocus(session.id);
      if (res.ok) {
        toast.push(t.toast_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });
  };

  return (
    <section
      aria-label={t.focus_title}
      className="relative overflow-hidden rounded-3xl border border-[#262F3C] p-6"
      style={{
        background: "linear-gradient(180deg, #151B23 0%, #12171E 100%)",
        boxShadow: "0 24px 60px rgba(10,14,19,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7C8A9E]">{t.focus_title}</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] ${
            active ? "bg-[#FF633C]/15 text-[#FFB16A]" : "bg-[#202833] text-[#66778C]"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#FF633C] animate-pulse" : "bg-[#4A5666]"}`} />
          {active ? t.focus_active_now : session ? t.status_pending : t.focus_none}
        </span>
      </div>

      <div className="relative mx-auto mt-2 grid place-items-center">
        <LampArt active={active} />
      </div>

      {/* text zone — when lit, the actual goal/task in clear white (spec §10.3) */}
      <div className="mt-1 text-center">
        {session ? (
          <>
            <p
              className={`text-[19px] font-semibold tracking-[-0.01em] transition-colors duration-700 ${
                active ? "text-white" : "text-[#8D9BAD]"
              }`}
            >
              {session.taskTitle ?? session.title}
            </p>
            <p className="mt-1 text-[12.5px] tabular-nums text-[#66778C]">
              {start && fmtDay(start)} · {start && fmtTime(start)} — {end && fmtTime(end)}
            </p>
          </>
        ) : (
          <p className="text-[14px] text-[#66778C]">{t.focus_none}</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {session ? (
          <>
            {active && (
              <button
                onClick={onEnd}
                disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#FF633C] px-5 text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
              >
                <Power size={15} /> {t.focus_end_now}
              </button>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#2C3644] bg-[#202833] px-5 text-[13px] font-medium text-[#C7D2E0] transition-colors hover:border-[#3A4757] active:scale-[0.97]"
            >
              {t.focus_edit}
            </button>
            <button
              onClick={onCancel}
              disabled={pending}
              aria-label={t.focus_cancel_session}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#2C3644] text-[#66778C] transition-colors hover:text-[#C7D2E0] active:scale-[0.97]"
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#FF633C] px-5 text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
          >
            <Plus size={15} /> {t.focus_schedule_cta}
          </button>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t.focus_schedule_cta}>
        <form onSubmit={onSchedule} className="flex flex-col gap-4">
          <Field label={t.focus_task_label}>
            <Select
              name="taskId"
              defaultValue={session?.taskId ?? ""}
              options={[
                { value: "", label: t.focus_free_label },
                ...taskOptions.map((o) => ({ value: o.id, label: o.title })),
              ]}
            />
          </Field>
          <Field label={t.task_title_label}>
            <Input name="title" placeholder={t.focus_free_label} defaultValue={session?.title ?? ""} maxLength={160} />
          </Field>
          <Field label={t.focus_date}>
            <Input type="date" name="date" required defaultValue={start ? start.toISOString().slice(0, 10) : today} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.focus_from}>
              <Input type="time" name="from" required defaultValue={start ? fmtTime(start) : "18:00"} />
            </Field>
            <Field label={t.focus_to}>
              <Input type="time" name="to" required defaultValue={end ? fmtTime(end) : "19:00"} />
            </Field>
          </div>
          <Button type="submit" variant="primary" busy={pending} className="mt-1 w-full">
            {t.save}
          </Button>
        </form>
      </Modal>
    </section>
  );
}
