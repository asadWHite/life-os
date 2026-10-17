import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/dictionaries";
import { db } from "@/db";
import { preferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { I18nProvider } from "@/components/i18n-provider";
import { OnboardingWizard, type OnboardingData } from "@/components/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.onboardingCompleted) redirect("/today");

  const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, user.id)).limit(1);
  const phone = (prefs?.phoneHabits ?? {}) as Record<string, boolean | null>;

  const initial: OnboardingData = {
    step: Math.min(Math.max(user.onboardingStep || 1, 1), 5),
    firstName: user.firstName,
    lastName: user.lastName,
    lifeStage: user.lifeStage ?? "",
    language: user.language,
    timezone: user.timezone,
    interests: prefs?.interests ?? [],
    challenges: prefs?.challenges ?? [],
    wakeTime: prefs?.wakeTime ?? "06:30",
    bedTime: prefs?.bedTime ?? "22:30",
    workHours: prefs?.workHours ?? "morning",
    freeTime: prefs?.freeTime ?? "1-2h",
    planningStyle: prefs?.planningStyle ?? "light",
    phoneMorning: phone.morning ?? null,
    phoneBed: phone.beforeBed ?? null,
    phoneReduce: phone.reduceLate ?? null,
  };

  const lang = (user.language as Locale) ?? "uz";

  return (
    <I18nProvider dict={getDict(lang)} locale={LOCALE_TAGS[lang] ?? "uz-UZ"} lang={lang}>
      <OnboardingWizard initial={initial} />
    </I18nProvider>
  );
}
