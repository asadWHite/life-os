"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sleepSessions, sleepSchedules } from "@/db/schema";
import { requireUser, ok, fail, type ActionResult } from "./helpers";
import { scheduledSleepMinutes, minutesBetween } from "@/lib/dates";
import { syncAchievements } from "@/lib/data";

const timeRe = /^\d{2}:\d{2}$/;

function refresh() {
  revalidatePath("/sleep");
  revalidatePath("/today");
  revalidatePath("/progress");
}

export async function saveSleepSchedule(raw: {
  targetBedtime: string;
  targetWake: string;
  weekdays: number[];
  remindBedtime?: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({
      targetBedtime: z.string().regex(timeRe),
      targetWake: z.string().regex(timeRe),
      weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
      remindBedtime: z.boolean().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return fail("invalid");
  const targetMinutes = scheduledSleepMinutes(parsed.data.targetBedtime, parsed.data.targetWake);
  await db
    .insert(sleepSchedules)
    .values({
      userId: user.id,
      targetBedtime: parsed.data.targetBedtime,
      targetWake: parsed.data.targetWake,
      targetMinutes,
      weekdays: parsed.data.weekdays,
      remindBedtime: parsed.data.remindBedtime ?? false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: sleepSchedules.userId,
      set: {
        targetBedtime: parsed.data.targetBedtime,
        targetWake: parsed.data.targetWake,
        targetMinutes,
        weekdays: parsed.data.weekdays,
        remindBedtime: parsed.data.remindBedtime ?? false,
        updatedAt: new Date(),
      },
    });
  refresh();
  return ok();
}

/**
 * Starts a sleep session. Idempotent against double-taps: if an active session
 * already exists it is returned instead of creating a duplicate (extra safety
 * comes from the partial unique index at the database level).
 */
export async function startSleep(): Promise<ActionResult> {
  const user = await requireUser();
  const [active] = await db
    .select()
    .from(sleepSessions)
    .where(and(eq(sleepSessions.userId, user.id), eq(sleepSessions.state, "active"), isNull(sleepSessions.endedAt)))
    .limit(1);
  if (active) {
    refresh();
    return ok({ extra: { alreadyActive: true } });
  }
  try {
    await db.insert(sleepSessions).values({ userId: user.id, startedAt: new Date(), state: "active" });
  } catch {
    // partial unique index fired — a concurrent request created a session
    return ok({ extra: { alreadyActive: true } });
  }
  refresh();
  return ok();
}

/** Ends the active session; duration computed from real timestamps (handles midnight). */
export async function endSleep(): Promise<ActionResult> {
  const user = await requireUser();
  const [active] = await db
    .select()
    .from(sleepSessions)
    .where(and(eq(sleepSessions.userId, user.id), eq(sleepSessions.state, "active"), isNull(sleepSessions.endedAt)))
    .limit(1);
  if (!active) return fail("no_active");
  const end = new Date();
  const duration = minutesBetween(active.startedAt, end);
  // Guard against corrupted/impossible sessions (> 20h = likely forgotten).
  await db
    .update(sleepSessions)
    .set({ endedAt: end, durationMinutes: duration, state: "completed", updatedAt: end })
    .where(eq(sleepSessions.id, active.id));
  refresh();
  const unlocked = await syncAchievements(user);
  return ok({ unlocked, extra: { durationMinutes: duration } });
}

/**
 * Corrects an accidental record without rewriting history: the row becomes
 * "discarded" and is excluded from every statistic, but it is not deleted.
 */
export async function discardSleepSession(sessionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const [s] = await db
    .select()
    .from(sleepSessions)
    .where(and(eq(sleepSessions.id, sessionId), eq(sleepSessions.userId, user.id)))
    .limit(1);
  if (!s) return fail("not_found");
  await db.update(sleepSessions).set({ state: "discarded", updatedAt: new Date() }).where(eq(sleepSessions.id, sessionId));
  refresh();
  return ok();
}
