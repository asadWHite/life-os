"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, preferences } from "@/db/schema";
import { requireUser, ok, fail, type ActionResult } from "./helpers";

const INTERESTS = ["education", "languages", "career", "fitness", "reading", "development", "creative", "routines", "productivity"];
const CHALLENGES = ["time", "studying", "sleep", "procrastination", "exercise", "focus", "planning"];

export async function updateIdentity(raw: { firstName: string; lastName?: string; lifeStage?: string }): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({
      firstName: z.string().trim().min(1).max(60),
      lastName: z.string().trim().max(60).optional(),
      lifeStage: z.enum(["school", "university", "working", "other"]).optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return fail("invalid");
  await db
    .update(users)
    .set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName ?? user.lastName,
      lifeStage: parsed.data.lifeStage ?? user.lifeStage,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  revalidatePath("/profile");
  revalidatePath("/today");
  return ok();
}

export async function updateSettings(raw: {
  language?: string;
  timezone?: string;
  appearance?: string;
  interests?: string[];
  challenges?: string[];
  wakeTime?: string;
  bedTime?: string;
  workHours?: string;
  freeTime?: string;
  planningStyle?: string;
  phoneMorning?: boolean;
  phoneBed?: boolean;
  phoneReduce?: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  const timeRe = /^\d{2}:\d{2}$/;

  const userPatch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (raw.language && ["uz", "en", "ru"].includes(raw.language)) userPatch.language = raw.language;
  if (raw.appearance && ["light", "dark", "system"].includes(raw.appearance)) userPatch.appearance = raw.appearance;
  if (raw.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: raw.timezone });
      userPatch.timezone = raw.timezone;
    } catch {
      return fail("invalid_timezone");
    }
  }
  await db.update(users).set(userPatch).where(eq(users.id, user.id));

  const prefPatch: Partial<typeof preferences.$inferInsert> = { updatedAt: new Date() };
  if (raw.interests) prefPatch.interests = raw.interests.filter((i) => INTERESTS.includes(i));
  if (raw.challenges) prefPatch.challenges = raw.challenges.filter((c) => CHALLENGES.includes(c));
  if (raw.wakeTime && timeRe.test(raw.wakeTime)) prefPatch.wakeTime = raw.wakeTime;
  if (raw.bedTime && timeRe.test(raw.bedTime)) prefPatch.bedTime = raw.bedTime;
  if (raw.workHours) prefPatch.workHours = raw.workHours.slice(0, 20);
  if (raw.freeTime) prefPatch.freeTime = raw.freeTime.slice(0, 10);
  if (raw.planningStyle) prefPatch.planningStyle = raw.planningStyle.slice(0, 20);
  if (raw.phoneMorning !== undefined || raw.phoneBed !== undefined || raw.phoneReduce !== undefined) {
    const [existing] = await db.select().from(preferences).where(eq(preferences.userId, user.id)).limit(1);
    const prev = (existing?.phoneHabits ?? {}) as Record<string, unknown>;
    prefPatch.phoneHabits = {
      ...prev,
      ...(raw.phoneMorning !== undefined ? { morning: raw.phoneMorning } : {}),
      ...(raw.phoneBed !== undefined ? { beforeBed: raw.phoneBed } : {}),
      ...(raw.phoneReduce !== undefined ? { reduceLate: raw.phoneReduce } : {}),
    };
  }
  await db.update(preferences).set(prefPatch).where(eq(preferences.userId, user.id));

  // Keep anon language cookie in sync so landing/auth pages render in-language.
  if (userPatch.language) {
    const jar = await cookies();
    jar.set("lifeos_lang", userPatch.language, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  revalidatePath("/profile");
  revalidatePath("/today");
  return ok();
}
