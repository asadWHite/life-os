/* Statistics engine — pure functions over record sets. The SAME rules are
   used by Today, Plan, Progress and the achievements evaluator so numbers
   are consistent everywhere.

   RULES (explicit, per spec §11.4):
   - Task completion for a day = completed / total tasks due that day
     (soft-deleted tasks excluded; completed tasks count by their due date).
   - Habit rate for a day = completed active habits / active habits.
   - Day score = mean of the rates of the categories that exist that day
     (tasks and/or habits). Sleep informs the dashboard but does NOT feed
     the day score.
   - Successful day (streak eligibility): at least 1 task completed AND
     task completion rate >= 60%. Days with zero scheduled tasks are
     neutral: they neither count nor break a streak.
*/

export const SUCCESS_RATE = 0.6;

export interface DayTask {
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
}

export interface DayHabitCompletion {
  date: string;
}

export function tasksByDay(tasks: DayTask[], date: string): { total: number; completed: number; rate: number } {
  const list = tasks.filter((t) => t.dueDate === date);
  const completed = list.filter((t) => t.completed).length;
  return {
    total: list.length,
    completed,
    rate: list.length === 0 ? 0 : completed / list.length,
  };
}

export function isSuccessfulDay(tasks: DayTask[], date: string): boolean {
  const { total, completed, rate } = tasksByDay(tasks, date);
  return total > 0 && completed >= 1 && rate >= SUCCESS_RATE;
}

export function dayScore(tasks: DayTask[], habitDates: DayHabitCompletion[], activeHabits: number, date: string): number | null {
  const t = tasksByDay(tasks, date);
  const parts: number[] = [];
  if (t.total > 0) parts.push(t.rate);
  if (activeHabits > 0) {
    const done = habitDates.filter((h) => h.date === date).length;
    parts.push(Math.min(1, done / activeHabits));
  }
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

/** Current streak of successful days ending today (or yesterday if today
 *  has no verdict yet). Zero-task days are skipped, never penalised. */
export function currentStreak(tasks: DayTask[], today: string, maxLookbackDays = 90): number {
  let streak = 0;
  let cursor = today;
  const todayVerdict = tasksByDay(tasks, today);
  if (todayVerdict.total > 0 && !isSuccessfulDay(tasks, today)) {
    return 0; // today is planned but target already missed? still may reach it — handled by caller using "through yesterday" variant
  }
  for (let i = 0; i < maxLookbackDays; i++) {
    const { total } = tasksByDay(tasks, cursor);
    if (total === 0) {
      cursor = shift(cursor, -1);
      continue;
    }
    if (isSuccessfulDay(tasks, cursor)) {
      streak++;
      cursor = shift(cursor, -1);
      continue;
    }
    if (cursor === today) {
      // today not yet successful — don't break, evaluate from yesterday
      cursor = shift(cursor, -1);
      continue;
    }
    break;
  }
  return streak;
}

/** Longest streak across the whole known history. */
export function bestStreak(tasks: DayTask[], today: string, maxLookbackDays = 120): number {
  let best = 0;
  let run = 0;
  for (let i = maxLookbackDays; i >= 0; i--) {
    const d = shift(today, -i);
    const { total } = tasksByDay(tasks, d);
    if (total === 0) continue;
    if (isSuccessfulDay(tasks, d)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

export function successfulDaysInMonth(tasks: DayTask[], monthPrefix: string): number {
  const dates = new Set(tasks.map((t) => t.dueDate).filter((d) => d.startsWith(monthPrefix)));
  let count = 0;
  for (const d of dates) if (isSuccessfulDay(tasks, d)) count++;
  return count;
}

export interface WeekPoint {
  date: string;
  weekday: number;
  score: number | null; // 0..1 or null when nothing planned
  tasksTotal: number;
  tasksDone: number;
}

export function weekSeries(
  tasks: DayTask[],
  habitDates: DayHabitCompletion[],
  activeHabits: number,
  endDate: string,
  days = 7,
): WeekPoint[] {
  const out: WeekPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = shift(endDate, -i);
    const t = tasksByDay(tasks, d);
    out.push({
      date: d,
      weekday: new Date(d + "T12:00:00Z").getUTCDay(),
      score: dayScore(tasks, habitDates, activeHabits, d),
      tasksTotal: t.total,
      tasksDone: t.completed,
    });
  }
  return out;
}

export function activeDays(tasks: DayTask[], habitDates: DayHabitCompletion[], windowDays: number, today: string): number {
  const cutoff = shift(today, -windowDays + 1);
  const days = new Set<string>();
  for (const t of tasks) if (t.completed && t.dueDate >= cutoff) days.add(t.dueDate);
  for (const h of habitDates) if (h.date >= cutoff) days.add(h.date);
  return days.size;
}

function shift(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export { shift as shiftDate };
