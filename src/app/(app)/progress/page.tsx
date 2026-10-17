import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { habitCompletions, habits, sleepSessions, sleepSchedules, tasks, userAchievements } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { todayInTz, addDays } from "@/lib/dates";
import { weekSeries, currentStreak, bestStreak, activeDays, type DayTask } from "@/lib/stats";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { ProgressView } from "@/components/progress-view";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const today = todayInTz(user.timezone);

  if (!db) {
    return (
      <ProgressView
        today={today}
        week={[]}
        weekCompletion={0.85}
        weekTasksDone={12}
        weekTasksTotal={15}
        habitConsistency={0.9}
        sleepSeries={[]}
        sleepTarget={480}
        sleepAvg={470}
        activeDays14={12}
        streakCurrent={5}
        streakBest={14}
        hasAnyData={true}
        achievements={ACHIEVEMENTS.map(a => ({ ...a, unlockedAt: new Date().toISOString() }))}
      />
    );
  }

  const from = addDays(today, -120);

  const [allTasks, activeHabits, completions, sleeps, schedule, unlocked] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), gte(tasks.dueDate, from))),
    db.select().from(habits).where(and(eq(habits.userId, user.id), eq(habits.active, true))),
    db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, user.id), gte(habitCompletions.date, from))),
    db
      .select()
      .from(sleepSessions)
      .where(and(eq(sleepSessions.userId, user.id), eq(sleepSessions.state, "completed")))
      .orderBy(desc(sleepSessions.startedAt))
      .limit(30),
    db.select().from(sleepSchedules).where(eq(sleepSchedules.userId, user.id)).limit(1),
    db.select().from(userAchievements).where(eq(userAchievements.userId, user.id)),
  ]);

  const dayTasks: DayTask[] = allTasks.map((t) => ({ dueDate: t.dueDate, completed: t.status === "completed" }));
  const habitDays = completions.map((c) => ({ date: c.date }));

  const week = weekSeries(dayTasks, habitDays, activeHabits.length, today, 7);
  const weekDaysPlanned = week.filter((w) => w.score != null);
  const weekCompletion =
    weekDaysPlanned.length === 0
      ? null
      : weekDaysPlanned.reduce((a, w) => a + (w.score ?? 0), 0) / weekDaysPlanned.length;

  const weekTasksTotal = week.reduce((a, w) => a + w.tasksTotal, 0);
  const weekTasksDone = week.reduce((a, w) => a + w.tasksDone, 0);

  const habitDaysThisWeek = completions.filter((c) => c.date >= addDays(today, -6)).length;
  const habitConsistency =
    activeHabits.length === 0 ? null : Math.min(1, habitDaysThisWeek / (activeHabits.length * 7));

  const target = schedule[0]?.targetMinutes ?? 480;
  const sleepSeries = sleeps
    .slice(0, 14)
    .reverse()
    .map((s) => ({
      date: s.startedAt.toISOString(),
      minutes: s.durationMinutes ?? 0,
    }));
  const sleepAvg = sleepSeries.length
    ? Math.round(sleepSeries.reduce((a, s) => a + s.minutes, 0) / sleepSeries.length)
    : null;

  const hasAnyData = allTasks.length > 0 || completions.length > 0 || sleeps.length > 0;

  return (
    <ProgressView
      today={today}
      week={week}
      weekCompletion={weekCompletion}
      weekTasksDone={weekTasksDone}
      weekTasksTotal={weekTasksTotal}
      habitConsistency={habitConsistency}
      sleepSeries={sleepSeries}
      sleepTarget={target}
      sleepAvg={sleepAvg}
      activeDays14={activeDays(dayTasks, habitDays, 14, today)}
      streakCurrent={currentStreak(dayTasks, today)}
      streakBest={bestStreak(dayTasks, today)}
      hasAnyData={hasAnyData}
      achievements={ACHIEVEMENTS.map((a) => ({
        ...a,
        unlockedAt: unlocked.find((u) => u.code === a.code)?.unlockedAt?.toISOString() ?? null,
      }))}
    />
  );
}
