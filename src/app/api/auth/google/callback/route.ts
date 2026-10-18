/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth 2.0 callback from Google.
 *
 * Flow:
 * 1. Validate CSRF state.
 * 2. Exchange code for tokens.
 * 3. Fetch Google profile.
 * 4. Find or create the Life OS user (preventing duplicates).
 * 5. Create a session and redirect to the app.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema } from "@/db";
import { users, preferences, sleepSchedules } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import { exchangeCodeForTokens, fetchGoogleUserInfo, isGoogleConfigured } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

function errRedirect(reason: string): Response {
  const url = new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!isGoogleConfigured()) {
    return errRedirect("oauth_not_configured");
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // Handle user cancellation
  if (errorParam === "access_denied") {
    return NextResponse.redirect(
      new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  }

  if (!code || !state) {
    return errRedirect("missing_params");
  }

  // CSRF state validation
  const jar = await cookies();
  const savedState = jar.get("google_oauth_state")?.value;
  jar.delete("google_oauth_state");

  if (!savedState || savedState !== state) {
    return errRedirect("state_mismatch");
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch the user's Google profile
    const googleUser = await fetchGoogleUserInfo(tokens.access_token);

    // Ensure DB schema is ready
    const ready = await ensureSchema();
    if (!ready) {
      return errRedirect("db_error");
    }

    // Determine the user's preferred language from Google locale
    const localeMap: Record<string, string> = { uz: "uz", ru: "ru", en: "en" };
    const lang = localeMap[googleUser.locale?.slice(0, 2) ?? ""] ?? "uz";

    // Find existing user by Google ID or email (prevents duplicates on first login)
    const [existing] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.googleId, googleUser.sub),
          eq(users.email, googleUser.email),
        ),
      )
      .limit(1);

    let userId: string;

    if (existing) {
      // Update Google ID and avatar if not yet linked
      await db
        .update(users)
        .set({
          googleId: existing.googleId ?? googleUser.sub,
          avatarUrl: existing.avatarUrl ?? googleUser.picture,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id));
      userId = existing.id;
    } else {
      // Create new user from Google profile
      const [newUser] = await db
        .insert(users)
        .values({
          email: googleUser.email,
          googleId: googleUser.sub,
          avatarUrl: googleUser.picture,
          firstName: googleUser.given_name || googleUser.name || "",
          lastName: googleUser.family_name || "",
          language: lang,
          timezone: "Asia/Tashkent", // user can update in onboarding / settings
          onboardingStep: 1,
          onboardingCompleted: false,
        })
        .returning({ id: users.id });

      userId = newUser.id;

      // Create 1:1 rows for new user
      await db.insert(preferences).values({ userId }).onConflictDoNothing();
      await db.insert(sleepSchedules).values({ userId }).onConflictDoNothing();
    }

    // Create session
    await createSession(userId);

    // Redirect based on onboarding status
    const [freshUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const dest = freshUser?.onboardingCompleted ? "/today" : "/onboarding";

    return NextResponse.redirect(
      new URL(dest, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  } catch (err) {
    console.error("[Google OAuth] callback error:", err);
    return errRedirect("callback_failed");
  }
}
