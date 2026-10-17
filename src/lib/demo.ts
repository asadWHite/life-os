import { cookies } from "next/headers";
import type { User } from "@/db/schema";

const DEMO_PROFILE_COOKIE = "lifeos_demo_profile";
const DEMO_PREFS_COOKIE = "lifeos_demo_prefs";
const YEAR = 60 * 60 * 24 * 365;

export interface DemoProfile {
  firstName: string;
  lastName: string;
  lifeStage: string;
  language: "uz" | "en" | "ru";
  timezone: string;
  appearance: "light" | "dark" | "system";
}

export interface DemoPrefs {
  interests: string[];
  challenges: string[];
  wakeTime: string;
  bedTime: string;
  workHours: string;
  freeTime: string;
  planningStyle: string;
  phoneMorning: boolean | null;
  phoneBed: boolean | null;
  phoneReduce: boolean | null;
}

export const DEMO_PROFILE_DEFAULTS: DemoProfile = {
  firstName: "Asadbek",
  lastName: "",
  lifeStage: "working",
  language: "uz",
  timezone: "Asia/Tashkent",
  appearance: "dark",
};

export const DEMO_PREFS_DEFAULTS: DemoPrefs = {
  interests: ["education", "fitness"],
  challenges: ["time", "focus"],
  wakeTime: "07:00",
  bedTime: "23:00",
  workHours: "morning",
  freeTime: "2-4h",
  planningStyle: "structured",
  phoneMorning: false,
  phoneBed: true,
  phoneReduce: true,
};

function safeParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export async function getDemoProfile(): Promise<DemoProfile> {
  const jar = await cookies();
  const fromCookie = safeParse<DemoProfile>(jar.get(DEMO_PROFILE_COOKIE)?.value, DEMO_PROFILE_DEFAULTS);
  const langCookie = jar.get("lifeos_lang")?.value;
  return {
    ...fromCookie,
    language: langCookie && ["uz", "en", "ru"].includes(langCookie) ? (langCookie as DemoProfile["language"]) : fromCookie.language,
  };
}

export async function getDemoPrefs(): Promise<DemoPrefs> {
  const jar = await cookies();
  return safeParse<DemoPrefs>(jar.get(DEMO_PREFS_COOKIE)?.value, DEMO_PREFS_DEFAULTS);
}

export async function getDemoUser(): Promise<User> {
  const p = await getDemoProfile();
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: "demo@lifeos.test",
    passwordHash: "",
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: null,
    lifeStage: p.lifeStage,
    language: p.language,
    timezone: p.timezone,
    appearance: p.appearance,
    onboardingStep: 6,
    onboardingCompleted: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date(),
  };
}

export async function saveDemoProfilePatch(patch: Partial<DemoProfile>): Promise<void> {
  const jar = await cookies();
  const current = await getDemoProfile();
  const next = { ...current, ...patch };
  jar.set(DEMO_PROFILE_COOKIE, JSON.stringify(next), { path: "/", maxAge: YEAR, sameSite: "lax" });
  if (patch.language) {
    jar.set("lifeos_lang", patch.language, { path: "/", maxAge: YEAR, sameSite: "lax" });
  }
}

export async function saveDemoPrefsPatch(patch: Partial<DemoPrefs>): Promise<void> {
  const jar = await cookies();
  const current = await getDemoPrefs();
  const next = { ...current, ...patch };
  jar.set(DEMO_PREFS_COOKIE, JSON.stringify(next), { path: "/", maxAge: YEAR, sameSite: "lax" });
}
