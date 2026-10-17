"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, Pencil, Check, X, ShieldCheck } from "lucide-react";
import { updateIdentity, updateSettings } from "@/app/actions/profile";
import { signOut, deleteMyAccount } from "@/app/actions/auth";
import { useI18n } from "./i18n-provider";
import { useToast } from "./toast";
import { Button, Chip, Field, Input, Segmented } from "./ui";
import { cn } from "@/lib/cn";

const INTERESTS = ["education", "languages", "career", "fitness", "reading", "development", "creative", "routines", "productivity"] as const;
const CHALLENGES = ["time", "studying", "sleep", "procrastination", "exercise", "focus", "planning"] as const;

const TIMEZONES = [
  "Asia/Tashkent", "Asia/Samarkand", "Europe/Moscow", "Europe/Istanbul",
  "Asia/Dubai", "Europe/London", "Europe/Berlin", "Asia/Almaty",
  "Asia/Tokyo", "America/New_York", "America/Los_Angeles", "UTC",
];

interface UserDto {
  firstName: string;
  lastName: string;
  email: string;
  lifeStage: string;
  language: string;
  timezone: string;
  appearance: string;
  memberSince: string;
}

interface PrefsDto {
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

export function ProfileView({ user, prefs }: { user: UserDto; prefs: PrefsDto }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /* identity editing */
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [lifeStage, setLifeStage] = useState(user.lifeStage);

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "·";
  const memberSince = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(user.memberSince + "T12:00:00Z"),
  );

  const saveIdentity = () =>
    startTransition(async () => {
      const res = await updateIdentity({ firstName: firstName.trim(), lastName: lastName.trim(), lifeStage: lifeStage || undefined });
      if (res.ok) {
        setEditing(false);
        toast.push(t.profile_saved);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });

  const saveSettings = (patch: Parameters<typeof updateSettings>[0], msg = t.prefs_saved) =>
    startTransition(async () => {
      const res = await updateSettings(patch);
      if (res.ok) {
        toast.push(msg);
        router.refresh();
      } else toast.push(t.toast_error, "error");
    });

  const [confirmDelete, setConfirmDelete] = useState(false);

  const yesNoRow = (
    label: string,
    value: boolean | null,
    onChange: (v: boolean) => void,
  ) => (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[13.5px] text-ink-2">{label}</span>
      <Segmented
        size="sm"
        value={value === null ? "null" : value ? "yes" : "no"}
        onChange={(v) => v !== "null" && onChange(v === "yes")}
        options={[
          { value: "null", label: "—" },
          { value: "yes", label: t.yes },
          { value: "no", label: t.no },
        ]}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* identity */}
      <section className="card overflow-hidden animate-rise">
        <div
          className="h-20"
          style={{
            background:
              "linear-gradient(120deg, color-mix(in srgb, var(--color-accent) 18%, transparent), rgba(255,177,106,0.22), transparent)",
          }}
        />
        <div className="-mt-9 px-5 pb-5">
          <div className="flex items-end justify-between">
            <div className="glass grid h-[72px] w-[72px] place-items-center rounded-3xl text-[22px] font-bold text-ink">
              {initials}
            </div>
            {!editing && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil size={13.5} /> {t.edit}
              </Button>
            )}
          </div>

          {editing ? (
            <div className="mt-4 flex flex-col gap-3 animate-rise">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.auth_first_name}>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} />
                </Field>
                <Field label={t.auth_last_name}>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} />
                </Field>
              </div>
              <Field label={t.ob_life_stage}>
                <div className="flex flex-wrap gap-2">
                  {(["school", "university", "working", "other"] as const).map((s) => (
                    <Chip key={s} active={lifeStage === s} onClick={() => setLifeStage(s)}>
                      {t[`stage_${s}` as const]}
                    </Chip>
                  ))}
                </div>
              </Field>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={saveIdentity} busy={pending}>
                  <Check size={14} /> {t.save}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X size={14} /> {t.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="mt-3 text-[20px] font-bold tracking-[-0.02em]">
                {firstName} {lastName}
              </h2>
              <p className="text-[13px] text-ink-3">{user.email}</p>
              <div className="mt-2.5 flex flex-wrap gap-2 text-[11.5px] font-medium text-ink-3">
                <span className="rounded-full bg-sunken px-2.5 py-1">
                  {t.member_since} {memberSince}
                </span>
                {user.lifeStage && (
                  <span className="rounded-full bg-sunken px-2.5 py-1">
                    {t[`stage_${user.lifeStage as "school" | "university" | "working" | "other"}` as const]}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* appearance & language */}
      <section className="card p-5 animate-rise">
        <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.prefs_title}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.language_label}>
            <Segmented
              value={user.language}
              onChange={(v) => saveSettings({ language: v })}
              options={[
                { value: "uz", label: "O'zbek" },
                { value: "en", label: "English" },
                { value: "ru", label: "Русский" },
              ]}
            />
          </Field>
          <Field label={t.appearance}>
            <Segmented
              value={user.appearance}
              onChange={(v) => saveSettings({ appearance: v })}
              options={[
                { value: "light", label: t.appearance_light },
                { value: "dark", label: t.appearance_dark },
                { value: "system", label: t.appearance_system },
              ]}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={t.timezone_label}>
            <select
              defaultValue={user.timezone}
              onChange={(e) => saveSettings({ timezone: e.target.value })}
              className="w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-[14px] text-ink focus:outline-none sm:max-w-[300px]"
            >
              {(TIMEZONES.includes(user.timezone) ? TIMEZONES : [user.timezone, ...TIMEZONES]).map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* interests & challenges */}
      <section className="card p-5 animate-rise">
        <h2 className="mb-1 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.interests_label}</h2>
        <PrefChips
          all={INTERESTS}
          selected={prefs.interests}
          labelKey={(k) => t[`int_${k as (typeof INTERESTS)[number]}` as const]}
          onSave={(values) => saveSettings({ interests: values })}
        />
        <h2 className="mb-1 mt-6 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.challenges_label}</h2>
        <PrefChips
          all={CHALLENGES}
          selected={prefs.challenges}
          labelKey={(k) => t[`ch_${k as (typeof CHALLENGES)[number]}` as const]}
          onSave={(values) => saveSettings({ challenges: values })}
        />
      </section>

      {/* rhythm */}
      <section className="card p-5 animate-rise">
        <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.schedule_label}</h2>
        <RhythmForm prefs={prefs} onSave={(patch) => saveSettings(patch)} saving={pending} />
      </section>

      {/* phone habits */}
      <section className="card p-5 animate-rise">
        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.phone_label}</h2>
        <div className="divide-y divide-line/60">
          {yesNoRow(t.ob_phone_morning, prefs.phoneMorning, (v) => saveSettings({ phoneMorning: v }))}
          {yesNoRow(t.ob_phone_bed, prefs.phoneBed, (v) => saveSettings({ phoneBed: v }))}
          {yesNoRow(t.ob_phone_reduce, prefs.phoneReduce, (v) => saveSettings({ phoneReduce: v }))}
        </div>
      </section>

      {/* account */}
      <section className="card p-5 animate-rise">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">{t.account_title}</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              <LogOut size={15} /> {t.sign_out}
            </Button>
          </form>
          {!confirmDelete ? (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} /> {t.delete_account}
            </Button>
          ) : (
            <div className="flex w-full flex-col gap-2 rounded-2xl bg-danger-bg p-4 animate-scale-in">
              <p className="text-[12.5px] leading-relaxed text-danger">{t.delete_confirm}</p>
              <div className="flex gap-2">
                <form action={deleteMyAccount}>
                  <Button type="submit" variant="danger" size="sm" className="!bg-danger !text-white">
                    {t.confirm}
                  </Button>
                </form>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  {t.cancel}
                </Button>
              </div>
            </div>
          )}
        </div>
        <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-3">
          <ShieldCheck size={13} className="mt-0.5 shrink-0" />
          {t.ob_why_personal}
        </p>
      </section>
    </div>
  );
}

function PrefChips({
  all,
  selected,
  labelKey,
  onSave,
}: {
  all: readonly string[];
  selected: string[];
  labelKey: (k: string) => string;
  onSave: (values: string[]) => void;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<string[]>(selected);
  const dirty =
    values.length !== selected.length || values.some((v) => !selected.includes(v));
  return (
    <div>
      <div className="flex flex-wrap gap-2 py-2">
        {all.map((k) => (
          <Chip
            key={k}
            active={values.includes(k)}
            onClick={() => setValues((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}
          >
            {labelKey(k)}
          </Chip>
        ))}
      </div>
      {dirty && (
        <Button size="sm" variant="primary" onClick={() => onSave(values)} className="animate-scale-in">
          <Check size={13.5} /> {t.save}
        </Button>
      )}
    </div>
  );
}

function RhythmForm({
  prefs,
  onSave,
  saving,
}: {
  prefs: PrefsDto;
  onSave: (patch: Parameters<typeof updateSettings>[0]) => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const [wake, setWake] = useState(prefs.wakeTime);
  const [bed, setBed] = useState(prefs.bedTime);
  const [work, setWork] = useState(prefs.workHours);
  const [free, setFree] = useState(prefs.freeTime);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.ob_wake}>
          <Input type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
        </Field>
        <Field label={t.ob_bed}>
          <Input type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
        </Field>
      </div>
      <Field label={t.ob_work_hours}>
        <div className="flex flex-wrap gap-2">
          {(["morning", "afternoon", "evening", "varies"] as const).map((w) => (
            <Chip key={w} active={work === w} onClick={() => setWork(w)}>
              {t[`wh_${w}` as const]}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label={t.ob_free_time}>
        <div className="flex flex-wrap gap-2">
          {(["lt1", "1-2h", "2-4h", "4h+"] as const).map((f) => (
            <Chip key={f} active={free === f} onClick={() => setFree(f)}>
              {f === "lt1" ? t.ft_lt1 : f === "1-2h" ? t.ft_1_2 : f === "2-4h" ? t.ft_2_4 : t.ft_4p}
            </Chip>
          ))}
        </div>
      </Field>
      <div>
        <Button variant="primary" size="sm" busy={saving} onClick={() => onSave({ wakeTime: wake, bedTime: bed, workHours: work, freeTime: free })}>
          <Check size={13.5} /> {t.save}
        </Button>
      </div>
    </div>
  );
}
