import { and, asc, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { goals, habitCompletions, habits, tasks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { todayInTz, addDays } from "@/lib/dates";
import { weekdayOfDate } from "@/lib/dates";
import { PlanView } from "@/components/plan-view";

export const dynamic = "force-dynamic";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const { date } = await searchParams;
  const today = todayInTz(user.timezone);
  const selected = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;

  // week containing selected date (Mon..Sun)
  const wd = (weekdayOfDate(selected) + 6) % 7; // Mon=0
  const weekStart = addDays(selected, -wd);
  const weekEnd = addDays(weekStart, 6);

  if (!db) {
    return (
      <PlanView
        today={today}
        selected={selected}
        weekDates={Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))}
        railCounts={{ [today]: 1 }}
        tasks={[
          { id: "1", title: "Dizaynni ko'rish", description: "", status: "pending", priority: "high", dueDate: today, startTime: null, reminderMinutes: null, goalId: null, suggested: false }
        ]}
        habits={[
          { id: "h1", name: "Kitob o'qish", description: "", frequency: "daily", targetPerWeek: 7, weekCount: 3, doneOnSelected: false }
        ]}
        goals={[
          { id: "g1", name: "Salomatlik", description: "Sog'lom turmush tarzi", status: "active", targetDate: null, linkedTotal: 5, linkedDone: 2 }
        ]}
      />
    );
  }

  const [dayTasks, userHabits, weekCompletions, userGoals, goalTasksAll] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), eq(tasks.dueDate, selected)))
      .orderBy(asc(tasks.createdAt)),
    db.select().from(habits).where(and(eq(habits.userId, user.id), eq(habits.active, true))),
    db
      .select()
      .from(habitCompletions)
      .where(and(eq(habitCompletions.userId, user.id), gte(habitCompletions.date, weekStart), lte(habitCompletions.date, weekEnd))),
    db.select().from(goals).where(and(eq(goals.userId, user.id), ne(goals.status, "archived"))),
    db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt))),
  ]);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const completionsByHabit = new Map<string, Set<string>>();
  for (const c of weekCompletions) {
    if (!completionsByHabit.has(c.habitId)) completionsByHabit.set(c.habitId, new Set());
    completionsByHabit.get(c.habitId)!.add(c.date);
  }

  // per-day task counts for the rail
  const from = weekStart;
  const to = weekEnd;
  const railCounts = new Map<string, number>();
  for (const tk of goalTasksAll) {
    if (tk.dueDate >= from && tk.dueDate <= to && tk.status !== "completed") {
      railCounts.set(tk.dueDate, (railCounts.get(tk.dueDate) ?? 0) + 1);
    }
  }

  return (
    <PlanView
      today={today}
      selected={selected}
      weekDates={weekDates}
      railCounts={Object.fromEntries(railCounts)}
      tasks={dayTasks.map((t) => ({
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
      }))}
      habits={userHabits.map((h) => ({
        id: h.id,
        name: h.name,
        description: h.description,
        frequency: h.frequency,
        targetPerWeek: h.targetPerWeek,
        weekCount: completionsByHabit.get(h.id)?.size ?? 0,
        doneOnSelected: completionsByHabit.get(h.id)?.has(selected) ?? false,
      }))}
      goals={userGoals.map((g) => {
        const linked = goalTasksAll.filter((t) => t.goalId === g.id);
        const done = linked.filter((t) => t.status === "completed").length;
        return {
          id: g.id,
          name: g.name,
          description: g.description,
          status: g.status,
          targetDate: g.targetDate,
          linkedTotal: linked.length,
          linkedDone: done,
        };
      })}
    />
  );
}
