"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, preferences, sleepSchedules, tasks, habits } from "@/db/schema";
import { requireUser, ok, fail, type ActionResult } from "./helpers";
import { scheduledSleepMinutes, todayInTz } from "@/lib/dates";
import { suggestionsFor } from "@/lib/plan";

const INTERESTS = ["education", "languages", "career", "fitness", "reading", "development", "creative", "routines", "productivity"];
const CHALLENGES = ["time", "studying", "sleep", "procrastination", "exercise", "focus", "planning"];
const STAGES = ["school", "university", "working", "other"];
const LANGS = ["uz", "en", "ru"];

const stepSchema = z.object({
  step: z.number().int().min(1).max(6),
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  lifeStage: z.enum(["school", "university", "working", "other"]).optional(),
  language: z.enum(["uz", "en", "ru"]).optional(),
  timezone: z.string().max(64).optional(),
  interests: z.array(z.string()).max(12).optional(),
  challenges: z.array(z.string()).max(10).optional(),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  bedTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workHours: z.string().max(20).optional(),
  freeTime: z.string().max(10).optional(),
  planningStyle: z.string().max(20).optional(),
  phoneMorning: z.boolean().optional(),
  phoneBed: z.boolean().optional(),
  phoneReduce: z.boolean().optional(),
});

/** Persists whichever step the user just completed — onboarding is resumable. */
export async function saveOnboardingStep(raw: z.infer<typeof stepSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = stepSchema.safeParse(raw);
  if (!parsed.success) return fail("invalid");
  const d = parsed.data;

  const userPatch: Partial<typeof users.$inferInsert> = { onboardingStep: d.step, updatedAt: new Date() };
  if (d.firstName !== undefined) userPatch.firstName = d.firstName;
  if (d.lastName !== undefined) userPatch.lastName = d.lastName;
  if (d.lifeStage && STAGES.includes(d.lifeStage)) userPatch.lifeStage = d.lifeStage;
  if (d.language && LANGS.includes(d.language)) userPatch.language = d.language;
  if (d.timezone) userPatch.timezone = d.timezone;
  await db.update(users).set(userPatch).where(eq(users.id, user.id));

  const prefPatch: Partial<typeof preferences.$inferInsert> = { updatedAt: new Date() };
  if (d.interests) prefPatch.interests = d.interests.filter((i) => INTERESTS.includes(i));
  if (d.challenges) prefPatch.challenges = d.challenges.filter((c) => CHALLENGES.includes(c));
  if (d.wakeTime) prefPatch.wakeTime = d.wakeTime;
  if (d.bedTime) prefPatch.bedTime = d.bedTime;
  if (d.workHours) prefPatch.workHours = d.workHours;
  if (d.freeTime) prefPatch.freeTime = d.freeTime;
  if (d.planningStyle) prefPatch.planningStyle = d.planningStyle;
  if (d.phoneMorning !== undefined || d.phoneBed !== undefined || d.phoneReduce !== undefined) {
    const [existing] = await db.select().from(preferences).where(eq(preferences.userId, user.id)).limit(1);
    const prev = (existing?.phoneHabits ?? {}) as Record<string, unknown>;
    prefPatch.phoneHabits = {
      ...prev,
      ...(d.phoneMorning !== undefined ? { morning: d.phoneMorning } : {}),
      ...(d.phoneBed !== undefined ? { beforeBed: d.phoneBed } : {}),
      ...(d.phoneReduce !== undefined ? { reduceLate: d.phoneReduce } : {}),
    };
  }
  await db.update(preferences).set(prefPatch).where(eq(preferences.userId, user.id));
  return ok();
}

/** Finalises onboarding: builds the sleep schedule + suggested starter plan. */
export async function completeOnboarding(): Promise<ActionResult> {
  const user = await requireUser();
  const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, user.id)).limit(1);

  const bedtime = prefs?.bedTime ?? "22:30";
  const wake = prefs?.wakeTime ?? "06:30";
  const targetMinutes = scheduledSleepMinutes(bedtime, wake);

  await db
    .insert(sleepSchedules)
    .values({ userId: user.id, targetBedtime: bedtime, targetWake: wake, targetMinutes })
    .onConflictDoUpdate({
      target: sleepSchedules.userId,
      set: { targetBedtime: bedtime, targetWake: wake, targetMinutes, updatedAt: new Date() },
    });

  // Rules-based starter suggestions (editable/dismissible normal tasks).
  const existing = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.userId, user.id))
    .limit(1);
  if (existing.length === 0 && prefs?.interests?.length) {
    const today = todayInTz(user.timezone);
    const suggestions = suggestionsFor(prefs.interests, prefs.wakeTime, {
      lifeStage: user.lifeStage,
      workHours: prefs.workHours,
      freeTime: prefs.freeTime,
      challenges: prefs.challenges,
    });
    if (suggestions.length) {
      await db.insert(tasks).values(
        suggestions.map((s) => ({
          userId: user.id,
          title: `i18n:${s.titleKey}`, // resolved to the user's language in the UI
          priority: s.priority,
          startTime: s.startTime ?? null,
          dueDate: today,
          suggested: true,
        })),
      );
    }
    // Seed one habit from their top interest cluster.
    const habitSeeds: Record<string, string> = {
      languages: "i18n:sug_english",
      reading: "i18n:sug_read",
      fitness: "i18n:sug_exercise",
      education: "i18n:sug_study",
    };
    for (const interest of prefs.interests) {
      if (habitSeeds[interest]) {
        await db.insert(habits).values({ userId: user.id, name: habitSeeds[interest], frequency: "daily", targetPerWeek: 7 });
        break;
      }
    }
  }

  await db.update(users).set({ onboardingCompleted: true, onboardingStep: 6, updatedAt: new Date() }).where(eq(users.id, user.id));
  revalidatePath("/today");
  return ok();
}
