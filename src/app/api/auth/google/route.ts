/**
 * GET /api/auth/google
 *
 * Initiates the Google OAuth 2.0 flow.
 * Stores a CSRF state token in a short-lived cookie, then redirects to Google.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl, generateOAuthState, isGoogleConfigured } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        setup_guide:
          "1. Go to https://console.cloud.google.com/ and create a project. " +
          "2. Enable the Google+ API. " +
          "3. Create OAuth 2.0 credentials (Web application type). " +
          "4. Add your redirect URI to Authorised redirect URIs. " +
          "5. Copy Client ID and Client Secret to your environment variables.",
      },
      { status: 503 },
    );
  }

  const state = generateOAuthState();

  const jar = await cookies();
  jar.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  const authUrl = buildGoogleAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
