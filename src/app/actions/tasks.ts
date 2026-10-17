"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireUser, ok, fail, type ActionResult } from "./helpers";
import { syncAchievements } from "@/lib/data";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(""),
  priority: z.enum(["low", "normal", "high"]).optional().default("normal"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  reminderMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
});

async function ownedTask(userId: string, taskId: string) {
  const [t] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
    .limit(1);
  return t ?? null;
}

function refresh() {
  revalidatePath("/today");
  revalidatePath("/plan");
  revalidatePath("/progress");
}

export async function createTask(raw: z.infer<typeof taskSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return fail("invalid");
  await db.insert(tasks).values({ ...parsed.data, userId: user.id });
  refresh();
  return ok();
}

export async function quickAddTask(title: string, dueDate: string): Promise<ActionResult> {
  return createTask({ title: title.trim(), description: "", priority: "normal", dueDate });
}

export async function updateTask(taskId: string, raw: z.infer<typeof taskSchema>): Promise<ActionResult> {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(taskId).success) return fail("invalid");
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return fail("invalid");
  if (!(await ownedTask(user.id, taskId))) return fail("not_found");
  await db.update(tasks).set({ ...parsed.data, updatedAt: new Date() }).where(eq(tasks.id, taskId));
  refresh();
  return ok();
}

/** Toggles completion and returns any newly unlocked achievements. */
export async function toggleTask(taskId: string): Promise<ActionResult> {
  const user = await requireUser();
  const t = await ownedTask(user.id, taskId);
  if (!t) return fail("not_found");
  const completing = t.status !== "completed";
  await db
    .update(tasks)
    .set({
      status: completing ? "completed" : "pending",
      completedAt: completing ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));
  refresh();
  const unlocked = await syncAchievements(user);
  return ok({ unlocked, extra: { completed: completing } });
}

/** Soft delete: the row stays so historical statistics never corrupt. */
export async function deleteTask(taskId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await ownedTask(user.id, taskId))) return fail("not_found");
  await db.update(tasks).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
  refresh();
  return ok();
}

export async function moveTaskToDate(taskId: string, dueDate: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return fail("invalid");
  if (!(await ownedTask(user.id, taskId))) return fail("not_found");
  await db
    .update(tasks)
    .set({ dueDate, status: "pending", completedAt: null, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));
  refresh();
  return ok();
}
