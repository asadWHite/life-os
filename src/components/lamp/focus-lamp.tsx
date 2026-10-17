"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Power, X } from "lucide-react";
import { scheduleFocus, endFocus, cancelFocus } from "@/app/actions/focus";
import { useI18n } from "../i18n-provider";
import { useToast } from "../toast";
import { Button, Field, Input, Modal, Select } from "../ui";
import { LampArt } from "./lamp-art";
import { cn } from "@/lib/cn";

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

  /* The lamp's state is *derived* from current time vs stored schedule.
     We update 'now' frequently to catch the exact moment of activation. */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 10_000); // 10s precision
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const start = session ? new Date(session.plannedStart) : null;
  const end = session ? new Date(session.plannedEnd) : null;
  const active = !!session && !!start && !!end && now >= start && now <= end;
  const upcoming = !!session && !!start && now < start;
  const completed = !!session && !!end && now >= end;

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
      className="relative overflow-hidden rounded-[2.5rem] border border-[#262F3C] p-8 md:p-14 flex flex-col items-center w-full"
      style={{
        background: "radial-gradient(140% 140% at 50% 10%, #1D2632 0%, #0F1419 100%)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.06)",
      }}
    >
      {/* Dynamic atmospheric light that responds to active state */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-[2000ms]",
          active ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: "radial-gradient(circle at 50% 35%, rgba(255,177,106,0.06) 0%, transparent 60%)"
        }}
      />

      <header className="w-full flex items-center justify-between z-10 mb-2">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.25em] text-[#7C8A9E] opacity-60">
            {t.focus_title}
          </h2>
          {session && (
            <div className="flex items-center gap-2.5">
              <span className={cn(
                "h-2.5 w-2.5 rounded-full",
                active ? "bg-[#FF633C] animate-pulse shadow-[0_0_12px_#FF633C]" : "bg-[#4A5666]"
              )} />
              <span className="text-[12px] font-bold uppercase tracking-widest text-[#66778C]">
                {active ? t.focus_active_now : upcoming ? t.status_pending : t.status_completed}
              </span>
            </div>
          )}
        </div>

        {!session && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex h-11 items-center gap-2.5 rounded-full bg-[#FF633C] px-6 text-[14px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.97] shadow-lg shadow-[#FF633C]/30"
          >
            <Plus size={18} /> {t.focus_schedule_cta}
          </button>
        )}
      </header>

      {/* Large central lamp artwork */}
      <div className="relative w-full max-w-[380px] md:max-w-[480px] z-0 -mt-2 md:-mt-6">
        <LampArt active={active} className="transform transition-transform duration-1000" />
      </div>

      {/* Primary session info zone */}
      <div className="w-full text-center z-10 -mt-10 md:-mt-16 mb-12">
        {session ? (
          <div className="flex flex-col gap-3">
            <h3 className={cn(
              "text-[28px] md:text-[42px] font-bold tracking-tight transition-colors duration-[1500ms] leading-[1.1]",
              active ? "text-white" : "text-[#8D9BAD]"
            )}>
              {session.taskTitle ?? session.title}
            </h3>
            <div className="flex items-center justify-center gap-3 text-[#66778C]">
               <p className="text-[15px] md:text-[18px] font-medium tabular-nums">
                {start && fmtDay(start)}
              </p>
              <span className="opacity-30">•</span>
              <p className="text-[15px] md:text-[18px] font-medium tabular-nums tracking-wide">
                {start && fmtTime(start)} — {end && fmtTime(end)}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-10">
            <p className="text-[18px] font-medium text-[#66778C] opacity-40 italic tracking-wide">
              {t.focus_none}
            </p>
          </div>
        )}
      </div>

      {/* Action controls */}
      {session && (
        <div className="flex flex-wrap items-center justify-center gap-5 z-10">
          {active && (
            <button
              onClick={onEnd}
              disabled={pending}
              className="inline-flex h-14 items-center gap-3 rounded-full bg-[#FF633C] px-10 text-[15px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.97] shadow-2xl shadow-[#FF633C]/40"
            >
              <Power size={20} /> {t.focus_end_now}
            </button>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex h-14 items-center gap-3 rounded-full border border-[#2C3644] bg-[#202833]/40 backdrop-blur-xl px-10 text-[15px] font-semibold text-[#C7D2E0] transition-all hover:border-[#3A4757] hover:bg-[#202833]/80 active:scale-[0.97]"
          >
            {t.focus_edit}
          </button>
          <button
            onClick={onCancel}
            disabled={pending}
            title={t.focus_cancel_session}
            className="grid h-14 w-14 place-items-center rounded-full border border-[#2C3644] bg-[#202833]/40 backdrop-blur-xl text-[#66778C] transition-all hover:text-[#C7D2E0] hover:bg-[#202833]/80 active:scale-[0.97]"
          >
            <X size={24} />
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t.focus_schedule_cta}>
        <form onSubmit={onSchedule} className="flex flex-col gap-5 pt-2">
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
          <div className="grid grid-cols-2 gap-4">
            <Field label={t.focus_from}>
              <Input type="time" name="from" required defaultValue={start ? fmtTime(start) : "18:00"} />
            </Field>
            <Field label={t.focus_to}>
              <Input type="time" name="to" required defaultValue={end ? fmtTime(end) : "19:00"} />
            </Field>
          </div>
          <div className="pt-2">
            <Button type="submit" variant="primary" busy={pending} className="w-full h-12 text-[15px]">
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
