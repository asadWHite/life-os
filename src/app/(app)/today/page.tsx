import { and, asc, desc, eq, gt, gte, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { tasks, habits, habitCompletions, sleepSessions, sleepSchedules, focusSessions, goals } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getDemoPrefs } from "@/lib/demo";
import { redirect } from "next/navigation";
import { todayInTz, formatDateHuman, hourInTz, addDays } from "@/lib/dates";
import { tasksByDay, dayScore } from "@/lib/stats";
import { brainRecommendations } from "@/lib/plan";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/dictionaries";
import { getDict } from "@/lib/i18n";
import { TodayView } from "@/components/today-view";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const today = todayInTz(user.timezone);
  const tomorrow = addDays(today, 1);
  const weekAgo = addDays(today, -90);

  // Demo Mode: Mock data if DB is not configured
  if (!db) {
    return (
      <TodayView
        name={user.firstName}
        greeting="Xayrli kun"
        dateHuman={formatDateHuman(today, "uz-UZ")}
        today={today}
        tz={user.timezone}
        tasks={[
          { id: "1", title: "Dizaynni ko'rib chiqish", description: "Life OS interfeysini o'rganish", status: "pending", priority: "high", dueDate: today, startTime: "10:00", reminderMinutes: 15, goalId: null, suggested: false },
          { id: "2", title: "Vazifa qo'shishni sinash", description: "", status: "completed", priority: "normal", dueDate: today, startTime: null, reminderMinutes: null, goalId: null, suggested: false }
        ]}
        overdue={[]}
        goals={[{ id: "g1", name: "Salomatlik" }]}
        habits={[
          { id: "h1", name: "Kitob o'qish", doneToday: true },
          { id: "h2", name: "Ertalabki badantarbiya", doneToday: false }
        ]}
        score={0.75}
        doneCount={1}
        totalCount={2}
        brain={["brain_light_day"]}
        sleep={{
          last: { durationMinutes: 460, targetMinutes: 480, startedAt: new Date(Date.now() - 86400000).toISOString(), endedAt: null },
          active: null,
          targetBedtime: "23:00",
          targetWake: "07:00"
        }}
        focus={{
          session: null,
          taskOptions: [{ id: "1", title: "Dizaynni ko'rib chiqish" }],
          tomorrow
        }}
      />
    );
  }

  const [rangeTasks, activeHabits, todayHabitRows, lastSleep, activeSleep, schedule, focusRows, userGoals] =
    await Promise.all([
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), gte(tasks.dueDate, weekAgo)))
        .orderBy(asc(tasks.dueDate), asc(tasks.createdAt)),
      db.select().from(habits).where(and(eq(habits.userId, user.id), eq(habits.active, true))),
      db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, user.id), eq(habitCompletions.date, today))),
      db
        .select()
        .from(sleepSessions)
        .where(and(eq(sleepSessions.userId, user.id), eq(sleepSessions.state, "completed")))
        .orderBy(desc(sleepSessions.startedAt))
        .limit(1),
      db
        .select()
        .from(sleepSessions)
        .where(and(eq(sleepSessions.userId, user.id), eq(sleepSessions.state, "active"), isNull(sleepSessions.endedAt)))
        .limit(1),
      db.select().from(sleepSchedules).where(eq(sleepSchedules.userId, user.id)).limit(1),
      db
        .select()
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, user.id),
            isNull(focusSessions.cancelledAt),
            isNull(focusSessions.completedAt),
            gt(focusSessions.plannedEnd, new Date()),
          ),
        )
        .orderBy(asc(focusSessions.plannedStart))
        .limit(1),
      db.select().from(goals).where(and(eq(goals.userId, user.id), ne(goals.status, "archived"))),
    ]);

  const dayTasks = rangeTasks.filter((t) => t.dueDate === today);
  const overdue = rangeTasks.filter((t) => t.dueDate < today && t.status !== "completed");
  const dayStats = tasksByDay(
    rangeTasks.map((t) => ({ dueDate: t.dueDate, completed: t.status === "completed" })),
    today,
  );
  const score = dayScore(
    rangeTasks.map((t) => ({ dueDate: t.dueDate, completed: t.status === "completed" })),
    todayHabitRows.map((h) => ({ date: h.date })).filter((h) => h.date === today),
    activeHabits.length,
    today,
  );

  const completedHabitIds = new Set(todayHabitRows.map((r) => r.habitId));
  const focused = focusRows[0] ?? null;

  const hour = hourInTz(new Date(), user.timezone);
  const dict = getDict(user.language);
  const locale = LOCALE_TAGS[(user.language as Locale)] ?? "uz-UZ";
  const greeting = hour < 12 ? dict.greeting_morning : hour < 18 ? dict.greeting_afternoon : dict.greeting_evening;

  const recs = brainRecommendations({
    pendingToday: dayTasks.filter((t) => t.status !== "completed").length,
    overdue: overdue.length,
    hasSleepSchedule: !!schedule[0],
    completionRate: dayStats.total > 0 ? dayStats.rate : null,
  });

  const focusTask = focused?.taskId ? rangeTasks.find((t) => t.id === focused.taskId) : null;

  return (
    <TodayView
      name={user.firstName || dict.app_name}
      greeting={greeting}
      dateHuman={formatDateHuman(today, locale)}
      today={today}
      tz={user.timezone}
      tasks={dayTasks.map(serializeTask)}
      overdue={overdue.slice(0, 8).map(serializeTask)}
      goals={userGoals.map((g) => ({ id: g.id, name: g.name }))}
      habits={activeHabits.map((h) => ({
        id: h.id,
        name: h.name,
        doneToday: completedHabitIds.has(h.id),
      }))}
      score={score}
      doneCount={dayStats.completed}
      totalCount={dayStats.total}
      brain={recs}
      sleep={{
        last: lastSleep[0]
          ? {
              durationMinutes: lastSleep[0].durationMinutes,
              targetMinutes: schedule[0]?.targetMinutes ?? 480,
              startedAt: lastSleep[0].startedAt.toISOString(),
              endedAt: lastSleep[0].endedAt?.toISOString() ?? null,
            }
          : null,
        active: activeSleep[0] ? { startedAt: activeSleep[0].startedAt.toISOString() } : null,
        targetBedtime: schedule[0]?.targetBedtime ?? null,
        targetWake: schedule[0]?.targetWake ?? null,
      }}
      focus={{
        session: focused
          ? {
              id: focused.id,
              title: focused.title,
              taskTitle: focusTask ? focusTask.title : null,
              taskId: focused.taskId,
              plannedStart: focused.plannedStart.toISOString(),
              plannedEnd: focused.plannedEnd.toISOString(),
            }
          : null,
        taskOptions: dayTasks
          .filter((t) => t.status !== "completed")
          .map((t) => ({ id: t.id, title: t.title.startsWith("i18n:") ? dict[t.title.slice(5) as keyof typeof dict] ?? t.title : t.title }))
          .slice(0, 12),
        tomorrow,
      }}
    />
  );
}

function serializeTask(t: typeof tasks.$inferSelect) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    startTime: t.startTime,
    reminderMinutes: t.reminderMinutes,
    goalId: t.goalId,
    suggested: t.suggested,
  };
}
