import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db, dbConfigured, ensureSchema } from "@/db";
import { authSessions, users, preferences, sleepSchedules, type User } from "@/db/schema";
import { eq, and, gt, lt } from "drizzle-orm";

const COOKIE_NAME = "lifeos_session";
const SESSION_DAYS = 30;

/* -------- password hashing (scrypt, salted, timing-safe compare) -------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/* ------------------------------- sessions ------------------------------ */

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({ tokenHash: sha256(token), userId, expiresAt: expires });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token && token !== "demo-mode-cookie" && db) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, sha256(token)));
  }
  jar.delete(COOKIE_NAME);
}

const DEMO_USER: User = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "demo@lifeos.test",
  passwordHash: "",
  firstName: "Asadbek",
  lastName: "",
  dateOfBirth: null,
  lifeStage: "working",
  language: "uz",
  timezone: "Asia/Tashkent",
  appearance: "dark",
  onboardingStep: 6,
  onboardingCompleted: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function isDemoUser(user: User): boolean {
  return user.id === DEMO_USER.id;
}

export async function getCurrentUser(): Promise<User | null> {
  // Demo Mode: If DB is not configured, always return the demo user.
  if (!dbConfigured()) return DEMO_USER;

  const ready = await ensureSchema().catch(() => false);
  if (!ready) return null;
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  // Also allow demo cookie (set when user clicks "Demo login")
  if (token === "demo-mode-cookie") return DEMO_USER;
  if (!token) return null;
  const tokenHash = sha256(token);
  const rows = await db
    .select({ user: users, expiresAt: authSessions.expiresAt })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  if (!rows[0]) return null;
  if (Math.random() < 0.02) {
    await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
  }
  return rows[0].user;
}

/** Ensures 1:1 preference + sleep schedule rows exist for a user. */
export async function ensureUserRows(userId: string): Promise<void> {
  await db.insert(preferences).values({ userId }).onConflictDoNothing();
  await db.insert(sleepSchedules).values({ userId }).onConflictDoNothing();
}

export async function deleteAccount(userId: string): Promise<void> {
  if (!db) return; // demo mode guard
  await db.delete(users).where(eq(users.id, userId)); // cascades all user data
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
