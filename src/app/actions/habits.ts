"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { habits, habitCompletions } from "@/db/schema";
import { requireUser, ok, fail, type ActionResult } from "./helpers";
import { syncAchievements } from "@/lib/data";

const habitSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
  frequency: z.enum(["daily", "weekly"]).default("daily"),
  targetPerWeek: z.number().int().min(1).max(7).default(7),
});

function refresh() {
  revalidatePath("/today");
  revalidatePath("/plan");
  revalidatePath("/progress");
}

export async function createHabit(raw: z.infer<typeof habitSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = habitSchema.safeParse(raw);
  if (!parsed.success) return fail("invalid");
  await db.insert(habits).values({ ...parsed.data, userId: user.id });
  refresh();
  return ok();
}

export async function deleteHabit(habitId: string): Promise<ActionResult> {
  const user = await requireUser();
  const [h] = await db.select().from(habits).where(and(eq(habits.id, habitId), eq(habits.userId, user.id))).limit(1);
  if (!h) return fail("not_found");
  await db.delete(habits).where(eq(habits.id, habitId)); // completions cascade
  refresh();
  return ok();
}

export async function archiveHabit(habitId: string): Promise<ActionResult> {
  const user = await requireUser();
  const [h] = await db.select().from(habits).where(and(eq(habits.id, habitId), eq(habits.userId, user.id))).limit(1);
  if (!h) return fail("not_found");
  await db.update(habits).set({ active: !h.active }).where(eq(habits.id, habitId));
  refresh();
  return ok();
}

/** Idempotent per (habit, date) — a unique index prevents double counting. */
export async function toggleHabitCompletion(habitId: string, date: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("invalid");
  const [h] = await db.select().from(habits).where(and(eq(habits.id, habitId), eq(habits.userId, user.id))).limit(1);
  if (!h) return fail("not_found");
  const [existing] = await db
    .select()
    .from(habitCompletions)
    .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, date)))
    .limit(1);
  if (existing) {
    await db.delete(habitCompletions).where(eq(habitCompletions.id, existing.id));
  } else {
    await db
      .insert(habitCompletions)
      .values({ habitId, userId: user.id, date })
      .onConflictDoNothing();
  }
  refresh();
  const unlocked = await syncAchievements(user);
  return ok({ unlocked });
}
