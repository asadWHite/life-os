import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDict, getLocaleForAnon } from "@/lib/i18n";
import { LOCALE_TAGS } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/components/i18n-provider";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(user.onboardingCompleted ? "/today" : "/onboarding");
  const lang = await getLocaleForAnon();
  const dict = getDict(lang);
  return (
    <I18nProvider dict={dict} locale={LOCALE_TAGS[lang] ?? "uz-UZ"} lang={lang}>
      <AuthForm mode="sign-up" />
    </I18nProvider>
  );
}
