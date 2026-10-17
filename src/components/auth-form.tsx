"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lamp } from "lucide-react";
import { signIn, signUp } from "@/app/actions/auth";
import { useI18n } from "./i18n-provider";
import { Button, Field, Input } from "./ui";
import type { Dict } from "@/lib/i18n/dictionaries";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
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
      </div>
    </main>
  );
}
