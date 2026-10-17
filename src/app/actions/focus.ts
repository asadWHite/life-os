"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { focusSessions, tasks } from "@/db/schema";
import { requireUser, ok, fail, type ActionResult } from "./helpers";
import { localToUtc } from "@/lib/dates";
import { minutesBetween } from "@/lib/dates";
import { syncAchievements } from "@/lib/data";

function refresh() {
  revalidatePath("/today");
  revalidatePath("/plan");
}

/** Schedules a focus window in the user's local time. */
export async function scheduleFocus(raw: {
  title: string;
  taskId?: string | null;
  date: string; // YYYY-MM-DD (user local)
  from: string; // "HH:MM"
  to: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(160),
      taskId: z.string().uuid().nullable().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      from: z.string().regex(/^\d{2}:\d{2}$/),
      to: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .safeParse(raw);
  if (!parsed.success) return fail("invalid");

  let start = localToUtc(parsed.data.date, parsed.data.from, user.timezone);
  let end = localToUtc(parsed.data.date, parsed.data.to, user.timezone);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // overnight focus window
  if (end.getTime() - start.getTime() > 16 * 60 * 60 * 1000) return fail("too_long");

  if (parsed.data.taskId) {
    const [t] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, parsed.data.taskId), eq(tasks.userId, user.id)))
      .limit(1);
    if (!t) return fail("task_not_found");
  }

  await db.insert(focusSessions).values({
    userId: user.id,
    taskId: parsed.data.taskId ?? null,
    title: parsed.data.title,
    plannedStart: start,
    plannedEnd: end,
  });
  refresh();
  return ok();
}

/**
 * Ends the currently active/scheduled focus session. If at least 15 minutes
 * elapsed since planned start, it counts as a completed focus session.
 */
export async function endFocus(sessionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const [s] = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.id, sessionId), eq(focusSessions.userId, user.id)))
    .limit(1);
  if (!s || s.cancelledAt || s.completedAt) return fail("not_found");
  const now = new Date();
  const minutes = minutesBetween(s.plannedStart, now);
  await db
    .update(focusSessions)
    .set({
      completedAt: now,
      plannedEnd: now < s.plannedEnd ? now : s.plannedEnd, // honest end time
    })
    .where(eq(focusSessions.id, sessionId));
  refresh();
  const unlocked = minutes >= 15 ? await syncAchievements(user) : [];
  return ok({ extra: { counted: minutes >= 15, minutes } });
}

export async function cancelFocus(sessionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const [s] = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.id, sessionId), eq(focusSessions.userId, user.id)))
    .limit(1);
  if (!s || s.cancelledAt || s.completedAt) return fail("not_found");
  await db.update(focusSessions).set({ cancelledAt: new Date() }).where(eq(focusSessions.id, sessionId));
  refresh();
  return ok();
}
