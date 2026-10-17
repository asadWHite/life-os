import { sleepStatus, clockDriftMinutes, consistency, sleepRecommendations } from "../src/lib/sleep.ts";
import { scheduledSleepMinutes, formatDuration, addDays, localToUtc, timeInTz } from "../src/lib/dates.ts";
import { isSuccessfulDay, currentStreak, bestStreak, successfulDaysInMonth, dayScore } from "../src/lib/stats.ts";
import { eligibleAchievements } from "../src/lib/achievements.ts";

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  const okv = JSON.stringify(actual) === JSON.stringify(expected);
  if (okv) pass++;
  else { fail++; console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

/* sleep status rules (spec 9.5) */
eq(sleepStatus(100, 480), "red", "<2h red priority");
eq(sleepStatus(119, 240), "red", "<2h red even w/ small target");
eq(sleepStatus(480, 480), "green", "exact target green");
eq(sleepStatus(500, 480), "green", "above target green");
eq(sleepStatus(360, 480), "yellow", "75% yellow");
eq(sleepStatus(400, 480), "yellow", "83% yellow");
eq(sleepStatus(300, 480), "red", "62.5% red");
eq(sleepStatus(null, 480), "none", "null none");
eq(sleepStatus(121, 480), "red", "2h+ but <75% red");

/* overnight schedule minutes */
eq(scheduledSleepMinutes("22:30", "06:30"), 480, "22:30->06:30 8h");
eq(scheduledSleepMinutes("23:00", "07:00"), 480, "23->07 8h");
eq(scheduledSleepMinutes("01:00", "09:00"), 480, "post-midnight");
eq(scheduledSleepMinutes("22:00", "22:00"), 1440, "same time 24h not zero");
eq(scheduledSleepMinutes("08:00", "22:00"), 840, "daytime");

/* clock drift / consistency */
eq(clockDriftMinutes("22:45", "22:30"), 15, "15m drift");
eq(clockDriftMinutes("22:15", "22:30"), 15, "neg drift abs");
eq(clockDriftMinutes("23:30", "00:00"), 30, "cross-midnight");
eq(clockDriftMinutes("00:30", "23:30"), 60, "circular");
eq(consistency(30), "on_time", "30 on time");
eq(consistency(60), "slightly_off", "60 slightly off");
eq(consistency(120), "off", "120 off");

/* duration fmt */
eq(formatDuration(480), "8h 00m", "480 fmt");
eq(formatDuration(75), "1h 15m", "75 fmt");
eq(formatDuration(-84), "−1h 24m", "negative fmt");

/* successful day */
const T = (date, completed) => ({ dueDate: date, completed });
eq(isSuccessfulDay([T("2025-01-01", true)], "2025-01-01"), true, "1/1");
eq(isSuccessfulDay([T("2025-01-01", true), T("2025-01-01", false), T("2025-01-01", false)], "2025-01-01"), false, "33% no");
eq(isSuccessfulDay([T("2025-01-01", true), T("2025-01-01", true), T("2025-01-01", false)], "2025-01-01"), true, "66% yes");
eq(isSuccessfulDay([], "2025-01-01"), false, "empty no");
eq(isSuccessfulDay([T("2025-01-01", false)], "2025-01-01"), false, "0 done no");

/* streaks */
const days = [];
for (let i = 1; i <= 5; i++) days.push(T(`2025-01-0${10 - i}`, true));
eq(currentStreak(days, "2025-01-10"), 5, "streak 5 today unplanned");
days.push(T("2025-01-10", true));
eq(currentStreak(days, "2025-01-10"), 6, "streak 6 incl today");
const broken = [T("2025-01-10", true), T("2025-01-09", true), T("2025-01-08", true), T("2025-01-07", false), T("2025-01-06", true)];
eq(currentStreak(broken, "2025-01-10"), 3, "broken stops");
const neutral = [T("2025-01-10", true), T("2025-01-08", true)];
eq(currentStreak(neutral, "2025-01-10"), 2, "zero-task neutral day");
eq(bestStreak(broken, "2025-01-10"), 3, "best streak");

/* month */
eq(successfulDaysInMonth([T("2025-01-03", true), T("2025-01-04", true), T("2025-02-01", true)], "2025-01"), 2, "month counts");

/* day score */
eq(dayScore([T("2025-01-01", true)], [{ date: "2025-01-01" }], 2, "2025-01-01"), 0.75, "task100+habit50=75");
eq(dayScore([], [], 0, "2025-01-01"), null, "nothing planned null");

/* achievements */
eq(eligibleAchievements({
  today: "2025-01-10", completedTasksTotal: 1,
  tasks: [T("2025-01-09", true)],
  greenSleepSessions: 0, goalsCompleted: 0, focusSessionsCompleted: 0,
}), ["first_step"], "first_step only");

const triple = eligibleAchievements({
  today: "2025-01-10", completedTasksTotal: 50,
  tasks: [T("2025-01-09", true), T("2025-01-08", true), T("2025-01-07", true)],
  greenSleepSessions: 6, goalsCompleted: 1, focusSessionsCompleted: 4,
});
eq(triple.includes("streak_3") && triple.includes("sleep_routine") && triple.includes("goal_master") && triple.includes("focused_planner"), true, "multi eligibility");

/* recommendations */
eq(sleepRecommendations({ avgMinutes: 300, targetMinutes: 480, beforeBedPhone: true, reduceLatePhone: true, sessions: 10 }).length > 0, true, "recs non-empty");
eq(sleepRecommendations({ avgMinutes: null, targetMinutes: 480, beforeBedPhone: null, reduceLatePhone: null, sessions: 0 }), ["rec_start_tracking", "rec_consistent_bedtime"], "new user recs");

/* dates */
eq(addDays("2025-01-31", 1), "2025-02-01", "month rollover");
eq(addDays("2024-12-31", 1), "2025-01-01", "year rollover");

eq(localToUtc("2025-01-10", "18:00", "Asia/Tashkent").toISOString(), "2025-01-10T13:00:00.000Z", "tashkent UTC+5 conv");
eq(localToUtc("2025-07-10", "12:00", "Europe/Berlin").toISOString(), "2025-07-10T10:00:00.000Z", "berlin CEST conv");
eq(localToUtc("2025-01-10", "12:00", "Europe/Berlin").toISOString(), "2025-01-10T11:00:00.000Z", "berlin CET conv");
eq(localToUtc("2025-06-10", "09:00", "America/New_York").toISOString(), "2025-06-10T13:00:00.000Z", "NYC EDT conv");
eq(timeInTz(new Date("2025-01-10T13:30:00.000Z"), "Asia/Tashkent"), "18:30", "timeInTz");

console.log(`\n${pass} passed, ${fail} failed`);
if (typeof process !== "undefined") process.exit(fail ? 1 : 0);
