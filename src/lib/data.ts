/* Shared data-access helpers + achievement unlock pipeline. */
import { db } from "@/db";
import {
  tasks,
  goals,
  habits,
  habitCompletions,
  sleepSessions,
  sleepSchedules,
  focusSessions,
  preferences,
  userAchievements,
  users,
  type User,
  type Preferences,
  type SleepSchedule,
} from "@/db/schema";
import { and, desc, eq, isNull, gte, lte, not } from "drizzle-orm";
import { eligibleAchievements, ACHIEVEMENTS, type AchievementDef } from "./achievements";
import { shiftDate } from "./stats";
import { todayInTz } from "./dates";
import { sleepStatus } from "./sleep";

export interface UserBundle {
  user: User;
  prefs: Preferences;
  schedule: SleepSchedule | null;
}

export async function getBundle(user: User): Promise<UserBundle> {
  const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, user.id)).limit(1);
  const [schedule] = await db.select().from(sleepSchedules).where(eq(sleepSchedules.userId, user.id)).limit(1);
  return { user, prefs: prefs ?? null as unknown as Preferences, schedule: schedule ?? null };
}

export async function loadTasksForRange(userId: string, from: string, to: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt), gte(tasks.dueDate, from), lte(tasks.dueDate, to)))
    .orderBy(tasks.dueDate, tasks.status, tasks.createdAt);
}

export async function loadRecentTasks(userId: string, today: string, pastDays = 120, futureDays = 30) {
  return loadTasksForRange(userId, shiftDate(today, -pastDays), shiftDate(today, futureDays));
}

/**
 * Recomputes achievement eligibility from real records and persists any new
 * unlocks. Returns the definitions of newly unlocked achievements so the
 * caller can surface a single concise reward dialog.
 */
export async function syncAchievements(user: User): Promise<AchievementDef[]> {
  const today = todayInTz(user.timezone);
  const [allTasks, greenSleeps, completedGoals, completedFocus, unlocked] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt))),
    db
      .select()
      .from(sleepSessions)
      .where(and(eq(sleepSessions.userId, user.id), eq(sleepSessions.state, "completed"))),
    db.select().from(goals).where(and(eq(goals.userId, user.id), eq(goals.status, "completed"))),
    db
      .select()
      .from(focusSessions)
      .where(and(eq(focusSessions.userId, user.id), not(isNull(focusSessions.completedAt)))),
    db.select().from(userAchievements).where(eq(userAchievements.userId, user.id)),
  ]);

  const [schedule] = await db.select().from(sleepSchedules).where(eq(sleepSchedules.userId, user.id)).limit(1);
  const target = schedule?.targetMinutes ?? 480;
  const greenCount = greenSleeps.filter(
    (s) => sleepStatus(s.durationMinutes, target) === "green",
  ).length;

  const facts = {
    today,
    completedTasksTotal: allTasks.filter((t) => t.status === "completed").length,
    tasks: allTasks.map((t) => ({ dueDate: t.dueDate, completed: t.status === "completed" })),
    greenSleepSessions: greenCount,
    goalsCompleted: completedGoals.length,
    focusSessionsCompleted: completedFocus.length,
  };

  const eligible = eligibleAchievements(facts);
  const already = new Set(unlocked.map((u) => u.code));
  const fresh = eligible.filter((c) => !already.has(c));
  for (const code of fresh) {
    await db.insert(userAchievements).values({ userId: user.id, code }).onConflictDoNothing();
  }
  return ACHIEVEMENTS.filter((a) => fresh.includes(a.code));
}

export async function getUnlockedAchievements(userId: string) {
  return db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
}

export { users };
