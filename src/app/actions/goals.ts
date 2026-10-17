"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { requireUser, ok, fail, type ActionResult } from "./helpers";
import { syncAchievements } from "@/lib/data";

const goalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().default(""),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

function refresh() {
  revalidatePath("/plan");
  revalidatePath("/progress");
  revalidatePath("/today");
}

export async function createGoal(raw: z.infer<typeof goalSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = goalSchema.safeParse(raw);
  if (!parsed.success) return fail("invalid");
  await db.insert(goals).values({ ...parsed.data, targetDate: parsed.data.targetDate ?? null, userId: user.id });
  refresh();
  return ok();
}

export async function setGoalStatus(goalId: string, status: "active" | "completed" | "archived"): Promise<ActionResult> {
  const user = await requireUser();
  if (!["active", "completed", "archived"].includes(status)) return fail("invalid");
  const [g] = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, user.id))).limit(1);
  if (!g) return fail("not_found");
  await db
    .update(goals)
    .set({ status, completedAt: status === "completed" ? new Date() : null })
    .where(eq(goals.id, goalId));
  refresh();
  const unlocked = status === "completed" ? await syncAchievements(user) : [];
  return ok({ unlocked });
}

export async function deleteGoal(goalId: string): Promise<ActionResult> {
  const user = await requireUser();
  const [g] = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, user.id))).limit(1);
  if (!g) return fail("not_found");
  await db.delete(goals).where(eq(goals.id, goalId)); // task.goalId set null via FK
  refresh();
  return ok();
}
