"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Lamp, Loader2 } from "lucide-react";
import { signIn, signUp } from "@/app/actions/auth";
import { useI18n } from "./i18n-provider";
import { Button, Field, Input } from "./ui";
import type { Dict } from "@/lib/i18n/dictionaries";

/* Google SVG logo — inline so no external image dependency */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M47.5 24.6c0-1.7-.1-3.4-.4-5H24v9.4h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.6z" />
      <path fill="#34A853" d="M24 48c6.6 0 12.1-2.2 16.2-5.9l-7.9-6c-2.2 1.5-5 2.3-8.3 2.3-6.4 0-11.8-4.3-13.7-10.1H2.1v6.2C6.2 42.6 14.5 48 24 48z" />
      <path fill="#FBBC05" d="M10.3 28.3c-.5-1.5-.8-3-.8-4.6 0-1.6.3-3.1.8-4.6V13h-8.2C.8 16 0 19.9 0 24c0 4.1.8 8 2.1 11l8.2-6.7z" />
      <path fill="#EA4335" d="M24 9.6c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.4 0 24 0 14.5 0 6.2 5.4 2.1 13l8.2 6.2C12.2 13.9 17.6 9.6 24 9.6z" />
    </svg>
  );
}

/* Map OAuth error codes to user-readable message keys */
const OAUTH_ERRORS: Record<string, string> = {
  oauth_not_configured: "auth_error_db",
  state_mismatch: "auth_error_invalid",
  callback_failed: "error_generic",
  db_error: "auth_error_db",
  missing_params: "auth_error_invalid",
};

export function AuthForm({ mode, dbReady }: { mode: "sign-in" | "sign-up"; dbReady?: boolean }) {
  const { t, ts, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [googleLoading, setGoogleLoading] = useState(false);

  // Show OAuth callback errors
  useEffect(() => {
    const oauthErr = searchParams.get("error");
    if (oauthErr) {
      const key = OAUTH_ERRORS[oauthErr] ?? "error_generic";
      setError(ts(key as keyof Dict));
    }
  }, [searchParams, ts]);

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

  const onGoogleSignIn = () => {
    setError(null);
    setGoogleLoading(true);
    // Navigate to our OAuth initiation route; server handles the redirect
    window.location.href = "/api/auth/google";
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

        {/* ── Google Sign In ── */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={googleLoading || pending}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-line bg-raised text-[14px] font-medium text-ink transition-all hover:border-line-strong hover:shadow-sm active:scale-[0.98] disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <GoogleLogo />
            )}
            {t.auth_google ?? "Continue with Google"}
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
            {t.auth_or ?? "or"}
          </span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
