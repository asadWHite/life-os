"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Lamp } from "lucide-react";
import { signIn, signUp } from "@/app/actions/auth";
import { useI18n } from "./i18n-provider";
import { Button, Field, Input } from "./ui";
import type { Dict } from "@/lib/i18n/dictionaries";

export function AuthForm({ mode, dbReady }: { mode: "sign-in" | "sign-up"; dbReady?: boolean }) {
  const { t, ts, lang } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (mode === "sign-up") {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tashkent";
          const res = await signUp({
            email: String(fd.get("email") ?? ""),
            password: String(fd.get("password") ?? ""),
            firstName: String(fd.get("firstName") ?? ""),
            lastName: String(fd.get("lastName") ?? ""),
            language: lang,
            timezone: tz,
          });
          if (!res.ok) {
            setError(ts(res.error as keyof Dict));
            return;
          }
          router.replace("/onboarding");
        } else {
          const res = await signIn({
            email: String(fd.get("email") ?? ""),
            password: String(fd.get("password") ?? ""),
          });
          if (!res.ok) {
            setError(ts(res.error as keyof Dict));
            return;
          }
          router.replace("/today");
        }
      } catch {
        setError(t.error_generic);
      }
    });
  };

  return (
    <main className="relative grid min-h-dvh place-items-center px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 420px at 80% -10%, rgba(255,177,106,0.12), transparent 60%), radial-gradient(600px 380px at 0% 110%, rgba(173,169,150,0.15), transparent 55%)",
        }}
      />
      <div className="card relative w-full max-w-[400px] p-8 animate-rise">
        <Link href="/" className="mb-7 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-ink">
            <Lamp size={18} />
          </div>
          <span className="text-[15px] font-bold">{t.app_name}</span>
        </Link>

        <h1 className="text-[22px] font-bold tracking-[-0.02em]">
          {mode === "sign-in" ? t.auth_signin_title : t.auth_signup_title}
        </h1>

        {dbReady === false && (
          <div className="mt-4 rounded-2xl border border-warning/25 bg-warning-bg px-4 py-3 text-[12.5px] leading-relaxed text-warning">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-[2px] shrink-0" />
              <div>
                <p className="font-semibold">{t.auth_setup_note}</p>
                <a href="/api/health" className="mt-1 inline-block font-bold underline underline-offset-2">
                  /api/health
                </a>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "sign-up" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.auth_first_name}>
                <Input name="firstName" required autoComplete="given-name" maxLength={60} />
              </Field>
              <Field label={t.auth_last_name}>
                <Input name="lastName" autoComplete="family-name" maxLength={60} />
              </Field>
            </div>
          )}
          <Field label={t.auth_email}>
            <Input name="email" type="email" required autoComplete="email" inputMode="email" />
          </Field>
          <Field label={t.auth_password}>
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" busy={pending} className="mt-1 w-full">
            {mode === "sign-in" ? t.auth_signin_cta : t.auth_signup_cta}
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-ink-3">
          {mode === "sign-in" ? t.auth_no_account : t.auth_have_account}{" "}
          <Link
            href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
            className="font-semibold text-ink underline-offset-2 hover:underline"
          >
            {mode === "sign-in" ? t.auth_signup_cta : t.auth_signin_cta}
          </Link>
        </p>

        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-3 text-center text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Demo
          </p>
          <DemoButton />
        </div>
      </div>
    </main>
  );
}

function DemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const enter = async () => {
    setBusy(true);
    try {
      // Demo: just call signIn with any credentials — server returns ok:true in Demo Mode
      const { signIn } = await import("@/app/actions/auth");
      const res = await signIn({ email: "demo@lifeos.test", password: "demo1234" });
      if (res.ok) router.replace("/today");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={enter}
      disabled={busy}
      className="group relative w-full overflow-hidden rounded-2xl border border-dashed border-line-strong bg-sunken/60 px-5 py-4 text-left transition-all hover:border-accent/40 hover:bg-sunken active:scale-[0.98] disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-ink">Demo rejimida kirish</p>
          <p className="text-[12px] text-ink-3">Baza kerak emas — dizaynni ko'ring</p>
        </div>
        {busy && (
          <svg className="animate-spin text-ink-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}
      </div>
    </button>
  );
}
