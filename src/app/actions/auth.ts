"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, dbConfigured, ensureSchema } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword, createSession, destroySession, ensureUserRows, deleteAccount } from "@/lib/auth";
import { requireUser } from "./helpers";

const emailSchema = z.string().trim().toLowerCase().email().max(200);
const passwordSchema = z.string().min(8).max(200);

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export async function signUp(input: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  language: string;
  timezone: string;
}): Promise<AuthResult> {
  const email = emailSchema.safeParse(input.email);
  const password = passwordSchema.safeParse(input.password);
  if (!email.success) return { ok: false, error: "auth_error_email" };
  if (!password.success) return { ok: false, error: "auth_error_weak" };
  if (!dbConfigured()) return { ok: false, error: "auth_error_db" };

  const ready = await ensureSchema(); // first-ever sign-up on a fresh database bootstraps tables
  if (!ready) return { ok: false, error: "auth_error_db" }
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.data)).limit(1);
  if (existing[0]) return { ok: false, error: "auth_error_exists" };

  const lang = ["uz", "en", "ru"].includes(input.language) ? input.language : "uz";
  const [user] = await db
    .insert(users)
    .values({
      email: email.data,
      passwordHash: hashPassword(password.data),
      firstName: (input.firstName || "").trim().slice(0, 60),
      lastName: (input.lastName ?? "").trim().slice(0, 60),
      language: lang,
      timezone: input.timezone?.slice(0, 64) || "Asia/Tashkent",
      onboardingStep: 1,
    })
    .returning();
  await ensureUserRows(user.id);
  await createSession(user.id);
  return { ok: true };
}

export async function signIn(input: { email: string; password: string }): Promise<AuthResult> {
  const email = emailSchema.safeParse(input.email);
  if (!email.success) return { ok: false, error: "auth_error_invalid" };
  if (!dbConfigured()) return { ok: false, error: "auth_error_db" };
  const ready = await ensureSchema();
  if (!ready) return { ok: false, error: "auth_error_db" };
  const [user] = await db.select().from(users).where(eq(users.email, email.data)).limit(1);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    return { ok: false, error: "auth_error_invalid" };
  }
  await ensureUserRows(user.id);
  await createSession(user.id);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function deleteMyAccount(): Promise<void> {
  const user = await requireUser();
  await deleteAccount(user.id);
  redirect("/");
}
