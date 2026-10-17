/* Integration tests against the real PostgreSQL database, exercising the
   same code paths the server actions use. Run: npx tsx --env-file=.env scripts/integration-tests.mts */
import { db } from "../src/db/index";
import { sql, eq, and, isNull } from "drizzle-orm";
import {
  users,
  preferences,
  sleepSchedules,
  tasks,
  sleepSessions,
  userAchievements,
  habits,
  habitCompletions,
  type User,
} from "../src/db/schema";
import { hashPassword, verifyPassword, ensureUserRows } from "../src/lib/auth";
import { syncAchievements } from "../src/lib/data";
import { suggestionsFor } from "../src/lib/plan";

let pass = 0;
let fail = 0;
const check = (cond: boolean, name: string) => {
  if (cond) pass++;
  else {
    fail++;
    console.error(`FAIL: ${name}`);
  }
};

const email = `test_${Date.now()}@lifeos.test`;
let userId = "";

async function main() {
  /* ---------- 1. password hashing ---------- */
  const hash = hashPassword("secret123");
  check(hash !== "secret123", "password is hashed (no plaintext)");
  check(verifyPassword("secret123", hash), "correct password verifies");
  check(!verifyPassword("wrongpass", hash), "wrong password rejected");

  /* ---------- 2. user + 1:1 rows ---------- */
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: hash, firstName: "Test", timezone: "Asia/Tashkent", language: "uz", onboardingStep: 1 })
    .returning();
  userId = user.id;
  await ensureUserRows(userId);
  await ensureUserRows(userId); // idempotent
  const prefRows = await db.select().from(preferences).where(eq(preferences.userId, userId));
  check(prefRows.length === 1, "ensureUserRows is idempotent (1 pref row)");
  const schedRows = await db.select().from(sleepSchedules).where(eq(sleepSchedules.userId, userId));
  check(schedRows.length === 1, "1 sleep schedule row");

  /* ---------- 3. plan generation rules ---------- */
  const sug = suggestionsFor(["languages", "fitness"], "06:30");
  check(sug.length >= 2 && sug.length <= 4, "suggestions bounded (2-4)");
  check(sug.some((s) => s.titleKey === "sug_english"), "languages → english suggestion");
  check(sug.some((s) => s.titleKey === "sug_exercise"), "fitness → exercise suggestion");

  /* ---------- 4. sleep session start/end + duplicate prevention ---------- */
  await db.insert(sleepSessions).values({ userId, startedAt: new Date(Date.now() - 9 * 3600_000), state: "active" });
  let dupError = false;
  try {
    await db.insert(sleepSessions).values({ userId, startedAt: new Date(), state: "active" });
  } catch {
    dupError = true;
  }
  check(dupError, "partial unique index blocks duplicate ACTIVE sleep session");

  const [active] = await db
    .select()
    .from(sleepSessions)
    .where(and(eq(sleepSessions.userId, userId), isNull(sleepSessions.endedAt)))
    .limit(1);
  const end = new Date();
  const duration = Math.round((end.getTime() - active.startedAt.getTime()) / 60000);
  await db
    .update(sleepSessions)
    .set({ endedAt: end, durationMinutes: duration, state: "completed" })
    .where(eq(sleepSessions.id, active.id));
  check(duration >= 539 && duration <= 541, `duration across synthetic 9h ≈ 540 (got ${duration})`);

  /* ---------- 5. tasks lifecycle ---------- */
  const [tk] = await db
    .insert(tasks)
    .values({ userId, title: "Write report", dueDate: "2025-12-01", priority: "high" })
    .returning();
  await db.update(tasks).set({ status: "completed", completedAt: new Date() }).where(eq(tasks.id, tk.id));
  let [r] = await db.select().from(tasks).where(eq(tasks.id, tk.id));
  check(r.status === "completed" && r.completedAt !== null, "task completion persisted");
  await db.update(tasks).set({ status: "pending", completedAt: null }).where(eq(tasks.id, tk.id));
  [r] = await db.select().from(tasks).where(eq(tasks.id, tk.id));
  check(r.status === "pending" && r.completedAt === null, "task reopen persisted");
  await db.update(tasks).set({ status: "completed", completedAt: new Date() }).where(eq(tasks.id, tk.id));
  await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, tk.id));
  const ghosts = await db.select().from(tasks).where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));
  check(ghosts.length === 0, "soft-deleted task excluded from active queries");
  const all = await db.select().from(tasks).where(eq(tasks.userId, userId));
  check(all.length === 1, "soft-deleted row preserved for history");

  /* ---------- 6. achievement sync: first_step (mirrors production: toggle→sync precedes any delete) ---------- */
  const [tk2] = await db
    .insert(tasks)
    .values({ userId, title: "First task", dueDate: "2025-12-02", status: "completed", completedAt: new Date() })
    .returning();
  const u = (await db.select().from(users).where(eq(users.id, userId)))[0] as User;
  const unlocked1 = await syncAchievements(u);
  check(unlocked1.some((a) => a.code === "first_step"), "first_step unlocked after 1 completed task");
  const unlocked2 = await syncAchievements(u);
  check(unlocked2.length === 0, "no duplicate unlocks on second sync");
  const ua = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  check(ua.length === 1, "exactly one unlock row persisted");

  /* ---------- 7. habit completion idempotency ---------- */
  const [hb] = await db.insert(habits).values({ userId, name: "Read 20m" }).returning();
  await db.insert(habitCompletions).values({ habitId: hb.id, userId, date: "2025-12-01" }).onConflictDoNothing();
  await db.insert(habitCompletions).values({ habitId: hb.id, userId, date: "2025-12-01" }).onConflictDoNothing();
  const hc = await db.select().from(habitCompletions).where(eq(habitCompletions.habitId, hb.id));
  check(hc.length === 1, "habit completion unique per (habit, date)");

  /* ---------- 8. cascade delete ---------- */
  await db.delete(users).where(eq(users.id, userId));
  const orphanChecks = await Promise.all([
    db.select().from(preferences).where(eq(preferences.userId, userId)),
    db.select().from(sleepSessions).where(eq(sleepSessions.userId, userId)),
    db.select().from(tasks).where(eq(tasks.userId, userId)),
    db.select().from(userAchievements).where(eq(userAchievements.userId, userId)),
  ]);
  check(orphanChecks.every((o) => o.length === 0), "account deletion cascades all user data");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  if (userId) await db.delete(users).where(eq(users.id, userId)).catch(() => {});
  try {
    await db.execute(sql`select 1`);
  } catch {}
  process.exit(1);
});
