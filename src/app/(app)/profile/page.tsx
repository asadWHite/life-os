import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { preferences } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ProfileView } from "@/components/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, user.id)).limit(1);
  const phone = (prefs?.phoneHabits ?? {}) as Record<string, boolean | null>;

  return (
    <ProfileView
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        lifeStage: user.lifeStage ?? "",
        language: user.language,
        timezone: user.timezone,
        appearance: user.appearance,
        memberSince: user.createdAt.toISOString().slice(0, 10),
      }}
      prefs={{
        interests: prefs?.interests ?? [],
        challenges: prefs?.challenges ?? [],
        wakeTime: prefs?.wakeTime ?? "06:30",
        bedTime: prefs?.bedTime ?? "22:30",
        workHours: prefs?.workHours ?? "morning",
        freeTime: prefs?.freeTime ?? "1-2h",
        planningStyle: prefs?.planningStyle ?? "light",
        phoneMorning: phone.morning ?? null,
        phoneBed: phone.beforeBed ?? null,
        phoneReduce: phone.reduceLate ?? null,
      }}
    />
  );
}
