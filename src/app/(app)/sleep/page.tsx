import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sleepSchedules, sleepSessions, preferences } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { sleepRecommendations } from "@/lib/sleep";
import { getDict } from "@/lib/i18n";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/dictionaries";
import { SleepView } from "@/components/sleep-view";

export const dynamic = "force-dynamic";

export default async function SleepPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const [scheduleRow, activeRow, history, prefs] = await Promise.all([
    db.select().from(sleepSchedules).where(eq(sleepSchedules.userId, user.id)).limit(1),
    db
      .select()
      .from(sleepSessions)
      .where(and(eq(sleepSessions.userId, user.id), eq(sleepSessions.state, "active"), isNull(sleepSessions.endedAt)))
      .limit(1),
    db
      .select()
      .from(sleepSessions)
      .where(and(eq(sleepSessions.userId, user.id)))
      .orderBy(desc(sleepSessions.startedAt))
      .limit(30),
    db.select().from(preferences).where(eq(preferences.userId, user.id)).limit(1),
  ]);

  const schedule = scheduleRow[0] ?? null;
  const target = schedule?.targetMinutes ?? 480;
  const completed = history.filter((s) => s.state === "completed" && s.durationMinutes != null);
  const last7 = completed.slice(0, 7);
  const avg = last7.length ? Math.round(last7.reduce((a, s) => a + (s.durationMinutes ?? 0), 0) / last7.length) : null;

  const phone = (prefs[0]?.phoneHabits ?? {}) as Record<string, boolean | null>;
  const recKeys = sleepRecommendations({
    avgMinutes: avg,
    targetMinutes: target,
    beforeBedPhone: phone.beforeBed ?? null,
    reduceLatePhone: phone.reduceLate ?? null,
    sessions: completed.length,
  });

  const lang = (user.language as Locale) ?? "uz";

  return (
    <SleepView
      schedule={{
        bedtime: schedule?.targetBedtime ?? "22:30",
        wake: schedule?.targetWake ?? "06:30",
        weekdays: schedule?.weekdays ?? [1, 2, 3, 4, 5, 6, 0],
        remindBedtime: schedule?.remindBedtime ?? false,
        targetMinutes: target,
      }}
      active={activeRow[0] ? { startedAt: activeRow[0].startedAt.toISOString() } : null}
      history={history.map((s) => ({
        id: s.id,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        durationMinutes: s.durationMinutes,
        state: s.state,
      }))}
      recKeys={recKeys}
      avgMinutes={avg}
      tz={user.timezone}
      dict={getDict(lang)}
      locale={LOCALE_TAGS[lang] ?? "uz-UZ"}
    />
  );
}
