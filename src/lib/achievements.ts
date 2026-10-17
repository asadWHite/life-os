/* Achievement definitions and evaluation — deterministic, auditable rules.
   Definitions live in code (versioned, explicit); unlock records live in the
   user_achievements table with a (userId, code) primary key so duplicates
   are impossible. Refreshing a page or re-completing a task can therefore
   never double-award. */

import { currentStreak, successfulDaysInMonth, type DayTask } from "./stats";

export interface AchievementDef {
  code: string;
  icon: string; // lucide icon key resolved in UI
  nameKey: string; // i18n keys
  descKey: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_step", icon: "footprints", nameKey: "ach_first_step", descKey: "ach_first_step_d" },
  { code: "streak_3", icon: "flame", nameKey: "ach_streak_3", descKey: "ach_streak_3_d" },
  { code: "streak_7", icon: "flame", nameKey: "ach_streak_7", descKey: "ach_streak_7_d" },
  { code: "streak_10", icon: "zap", nameKey: "ach_streak_10", descKey: "ach_streak_10_d" },
  { code: "streak_14", icon: "zap", nameKey: "ach_streak_14", descKey: "ach_streak_14_d" },
  { code: "consistent_month", icon: "calendar-check", nameKey: "ach_month", descKey: "ach_month_d" },
  { code: "sleep_routine", icon: "moon-star", nameKey: "ach_sleep", descKey: "ach_sleep_d" },
  { code: "goal_master", icon: "target", nameKey: "ach_goal", descKey: "ach_goal_d" },
  { code: "focused_planner", icon: "lamp", nameKey: "ach_focus", descKey: "ach_focus_d" },
];

export interface AchievementFacts {
  today: string; // user's local today
  completedTasksTotal: number; // lifetime completed (not deleted)
  tasks: DayTask[]; // for streak math
  greenSleepSessions: number; // completed sessions with duration >= target
  goalsCompleted: number;
  focusSessionsCompleted: number; // user ended after >= 15 min
}

/** Pure evaluator — returns codes the user is eligible for right now. */
export function eligibleAchievements(f: AchievementFacts): string[] {
  const out: string[] = [];
  if (f.completedTasksTotal >= 1) out.push("first_step");
  const streak = currentStreak(f.tasks, f.today);
  if (streak >= 3) out.push("streak_3");
  if (streak >= 7) out.push("streak_7");
  if (streak >= 10) out.push("streak_10");
  if (streak >= 14) out.push("streak_14");
  if (successfulDaysInMonth(f.tasks, f.today.slice(0, 7)) >= 20) out.push("consistent_month");
  if (f.greenSleepSessions >= 5) out.push("sleep_routine");
  if (f.goalsCompleted >= 1) out.push("goal_master");
  if (f.focusSessionsCompleted >= 3) out.push("focused_planner");
  return out;
}
