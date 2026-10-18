"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lamp, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { saveOnboardingStep, completeOnboarding } from "@/app/actions/onboarding";
import { useI18n } from "./i18n-provider";
import { Button, Chip, Field, Input, Segmented } from "./ui";

export interface OnboardingData {
  step: number;
  firstName: string;
  lastName: string;
  lifeStage: string;
  language: string;
  timezone: string;
  interests: string[];
  challenges: string[];
  wakeTime: string;
  bedTime: string;
  workHours: string;
  freeTime: string;
  planningStyle: string;
  phoneMorning: boolean | null;
  phoneBed: boolean | null;
  phoneReduce: boolean | null;
}

const TOTAL_STEPS = 5;

const TIMEZONES = [
  "Asia/Tashkent", "Asia/Samarkand", "Europe/Moscow", "Europe/Istanbul",
  "Asia/Dubai", "Europe/London", "Europe/Berlin", "Asia/Almaty",
  "Asia/Tokyo", "America/New_York", "America/Los_Angeles", "UTC",
];

const INTERESTS = ["education", "languages", "career", "fitness", "reading", "development", "creative", "routines", "productivity"] as const;
const CHALLENGES = ["time", "studying", "sleep", "procrastination", "exercise", "focus", "planning"] as const;

export function OnboardingWizard({ initial }: { initial: OnboardingData }) {
  const { t, ts } = useI18n();
  const router = useRouter();
  const [d, setD] = useState<OnboardingData>(initial);
  const [finishing, setFinishing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const detectedTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tashkent",
    [],
  );

  const persist = (patch: Partial<OnboardingData>, step: number) =>
    saveOnboardingStep({
      step,
      firstName: patch.firstName,
      lastName: patch.lastName,
      lifeStage: (patch.lifeStage || undefined) as never,
      language: patch.language as never,
      timezone: patch.timezone,
      interests: patch.interests,
      challenges: patch.challenges,
      wakeTime: patch.wakeTime,
      bedTime: patch.bedTime,
      workHours: patch.workHours,
      freeTime: patch.freeTime,
      planningStyle: patch.planningStyle,
      phoneMorning: patch.phoneMorning ?? undefined,
      phoneBed: patch.phoneBed ?? undefined,
      phoneReduce: patch.phoneReduce ?? undefined,
    });

  const goNext = () => {
    setError(null);
    if (d.step === 1 && !d.firstName.trim()) {
      setError(t.auth_first_name + " — " + t.required);
      return;
    }
    const nextStep = d.step + 1;
    if (nextStep > TOTAL_STEPS) {
      finish();
      return;
    }
    startTransition(async () => {
      await persist(d, nextStep).catch(() => {});
      setD((p) => ({ ...p, step: nextStep }));
    });
  };

  const goBack = () => d.step > 1 && setD((p) => ({ ...p, step: p.step - 1 }));

  const finish = () => {
    setFinishing(true);
    startTransition(async () => {
      try {
        await persist(d, 5);
        const res = await completeOnboarding();
        if (res.ok) router.replace("/today");
        else {
          setError(t.error_generic);
          setFinishing(false);
        }
      } catch {
        setError(t.error_generic);
        setFinishing(false);
      }
    });
  };

  const toggle = (key: "interests" | "challenges", value: string) =>
    setD((p) => ({
      ...p,
      [key]: p[key].includes(value) ? p[key].filter((v) => v !== value) : [...p[key], value],
    }));

  const yesNo = (key: "phoneMorning" | "phoneBed" | "phoneReduce", label: string) => (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-raised px-4 py-3.5">
      <span className="text-[14px] text-ink-2">{label}</span>
      <Segmented
        size="sm"
        value={d[key] === null ? "null" : d[key] ? "yes" : "no"}
        onChange={(v) =>
          setD((p) => ({ ...p, [key]: v === "null" ? null : v === "yes" }))
        }
        options={[
          { value: "null", label: "—" },
          { value: "yes", label: t.yes },
          { value: "no", label: t.no },
        ]}
      />
    </div>
  );

  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 420px at 85% -10%, rgba(255,177,106,0.13), transparent 60%), radial-gradient(600px 380px at -5% 110%, rgba(173,169,150,0.15), transparent 55%)",
        }}
      />
      <div className="card relative w-full max-w-[520px] p-7 md:p-9 animate-rise">
        {/* header + progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink">
              <Lamp size={15} />
            </div>
            <span className="text-[13px] font-bold">{t.app_name}</span>
          </div>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            {ts("ob_step_of", { n: d.step, total: TOTAL_STEPS })}
          </span>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${(d.step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div key={d.step} className="mt-7 animate-rise">
          {/* STEP 1 — personal */}
          {d.step === 1 && (
            <div className="flex flex-col gap-4">
              <header>
                <h1 className="text-[21px] font-bold tracking-[-0.02em]">{t.ob_personal_title}</h1>
                <p className="mt-1 text-[13px] text-ink-3">{t.ob_personal_sub}</p>
              </header>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.auth_first_name}>
                  <Input value={d.firstName} onChange={(e) => setD({ ...d, firstName: e.target.value })} maxLength={60} autoFocus />
                </Field>
                <Field label={t.auth_last_name}>
                  <Input value={d.lastName} onChange={(e) => setD({ ...d, lastName: e.target.value })} maxLength={60} />
                </Field>
              </div>
              <Field label={t.ob_life_stage}>
                <div className="flex flex-wrap gap-2">
                  {(["school", "university", "working", "other"] as const).map((s) => (
                    <Chip key={s} active={d.lifeStage === s} onClick={() => setD({ ...d, lifeStage: s })}>
                      {t[`stage_${s}` as const]}
                    </Chip>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.ob_language}>
                  <Segmented
                    value={d.language}
                    onChange={(v) => setD({ ...d, language: v })}
                    options={[
                      { value: "uz", label: "UZ" },
                      { value: "en", label: "EN" },
                      { value: "ru", label: "RU" },
                    ]}
                  />
                </Field>
                <Field label={t.ob_timezone}>
                  <select
                    value={d.timezone}
                    onChange={(e) => setD({ ...d, timezone: e.target.value })}
                    className="w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-[13px] text-ink focus:outline-none"
                  >
                    {(TIMEZONES.includes(d.timezone) ? TIMEZONES : [d.timezone, ...TIMEZONES]).map((tz) => (
                      <option key={tz} value={tz}>
                        {tz === detectedTz ? `${tz} ✓` : tz}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="text-[11.5px] leading-relaxed text-ink-3">{t.ob_why_personal}</p>
            </div>
          )}

          {/* STEP 2 — interests */}
          {d.step === 2 && (
            <div className="flex flex-col gap-4">
              <header>
                <h1 className="text-[21px] font-bold tracking-[-0.02em]">{t.ob_interests_title}</h1>
                <p className="mt-1 text-[13px] text-ink-3">{t.ob_interests_sub}</p>
              </header>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <Chip key={i} active={d.interests.includes(i)} onClick={() => toggle("interests", i)}>
                    {t[`int_${i}` as const]}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — challenges */}
          {d.step === 3 && (
            <div className="flex flex-col gap-4">
              <header>
                <h1 className="text-[21px] font-bold tracking-[-0.02em]">{t.ob_challenges_title}</h1>
                <p className="mt-1 text-[13px] text-ink-3">{t.ob_challenges_sub}</p>
              </header>
              <div className="flex flex-wrap gap-2">
                {CHALLENGES.map((c) => (
                  <Chip key={c} active={d.challenges.includes(c)} onClick={() => toggle("challenges", c)}>
                    {t[`ch_${c}` as const]}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 — schedule */}
          {d.step === 4 && (
            <div className="flex flex-col gap-4">
              <header>
                <h1 className="text-[21px] font-bold tracking-[-0.02em]">{t.ob_schedule_title}</h1>
                <p className="mt-1 text-[13px] text-ink-3">{t.ob_schedule_sub}</p>
              </header>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.ob_wake}>
                  <Input type="time" value={d.wakeTime} onChange={(e) => setD({ ...d, wakeTime: e.target.value })} />
                </Field>
                <Field label={t.ob_bed}>
                  <Input type="time" value={d.bedTime} onChange={(e) => setD({ ...d, bedTime: e.target.value })} />
                </Field>
              </div>

              {/* Only show work/busy hours question if not a school student
                  (school students have fixed hours already known) */}
              {d.lifeStage !== "school" && (
                <Field label={
                  d.lifeStage === "university" ? "Darslar qachon?" : t.ob_work_hours
                }>
                  <div className="flex flex-wrap gap-2">
                    {(["morning", "afternoon", "evening", "varies"] as const).map((w) => (
                      <Chip key={w} active={d.workHours === w} onClick={() => setD({ ...d, workHours: w })}>
                        {t[`wh_${w}` as const]}
                      </Chip>
                    ))}
                  </div>
                </Field>
              )}

              <Field label={t.ob_free_time}>
                <div className="flex flex-wrap gap-2">
                  {(["lt1", "1-2h", "2-4h", "4h+"] as const).map((f) => (
                    <Chip key={f} active={d.freeTime === f} onClick={() => setD({ ...d, freeTime: f })}>
                      {f === "lt1" ? t.ft_lt1 : f === "1-2h" ? t.ft_1_2 : f === "2-4h" ? t.ft_2_4 : t.ft_4p}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label={t.ob_planning_style}>
                <div className="flex flex-wrap gap-2">
                  {(["light", "structured", "flexible"] as const).map((p) => (
                    <Chip key={p} active={d.planningStyle === p} onClick={() => setD({ ...d, planningStyle: p })}>
                      {t[`ps_${p}` as const]}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* STEP 5 — phone + finish */}
          {d.step === 5 && (
            <div className="flex flex-col gap-4">
              <header>
                <h1 className="text-[21px] font-bold tracking-[-0.02em]">{t.ob_phone_title}</h1>
                <p className="mt-1 text-[13px] text-ink-3">{t.ob_phone_sub}</p>
              </header>
              {yesNo("phoneMorning", t.ob_phone_morning)}
              {yesNo("phoneBed", t.ob_phone_bed)}
              {yesNo("phoneReduce", t.ob_phone_reduce)}
              <div className="mt-1 rounded-2xl bg-sunken px-4 py-3.5">
                <p className="text-[13px] font-semibold text-ink">{t.ob_finish_title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{t.ob_finish_sub}</p>
                <p className="mt-1.5 text-[11.5px] italic text-ink-3">{t.ob_plan_note}</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}

        {/* footer nav */}
        <div className="mt-7 flex items-center justify-between">
          {d.step > 1 ? (
            <Button variant="ghost" onClick={goBack} disabled={pending}>
              <ArrowLeft size={15} /> {t.back}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={goNext} busy={pending || finishing}>
            {d.step === TOTAL_STEPS ? (
              <>
                {t.ob_finish_cta} <Check size={15} />
              </>
            ) : (
              <>
                {t.next} <ArrowRight size={15} />
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
