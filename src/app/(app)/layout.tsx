import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/components/i18n-provider";
import { ToastProvider } from "@/components/toast";
import { RewardProvider } from "@/components/reward";
import { AppNav } from "@/components/nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const dict = getDict(user.language);
  const lang = (user.language as Locale) ?? "uz";

  return (
    <I18nProvider dict={dict} locale={LOCALE_TAGS[lang] ?? "uz-UZ"} lang={lang}>
      <ToastProvider>
        <RewardProvider>
          <AppNav />
          <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 md:pl-32 md:pr-6 md:pt-12">
            {children}
          </div>
        </RewardProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
