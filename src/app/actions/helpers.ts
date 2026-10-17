import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/db/schema";
import type { AchievementDef } from "@/lib/achievements";

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  unlocked?: Pick<AchievementDef, "code" | "icon" | "nameKey" | "descKey">[];
  extra?: Record<string, unknown>;
}

export const ok = (extra?: Partial<ActionResult>): ActionResult => ({ ok: true, ...extra });
export const fail = (error: string): ActionResult => ({ ok: false, error });
