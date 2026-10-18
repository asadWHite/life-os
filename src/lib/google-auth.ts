/**
 * Google OAuth 2.0 helper.
 *
 * Uses vanilla fetch — no extra library required.
 *
 * Environment variables (set in .env or Vercel dashboard):
 *   GOOGLE_CLIENT_ID      — from Google Cloud Console OAuth 2.0 credentials
 *   GOOGLE_CLIENT_SECRET  — from Google Cloud Console OAuth 2.0 credentials
 *   GOOGLE_REDIRECT_URI   — must match exactly what is registered in the console
 *                           e.g. https://your-domain.com/api/auth/google/callback
 *
 * The redirect URI must be added to:
 *   Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
 *   → Authorised redirect URIs
 */

export interface GoogleTokens {
  access_token: string;
  id_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
}

export interface GoogleUserInfo {
  sub: string; // unique Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Build the Google authorisation URL + PKCE-style state for CSRF protection. */
export function buildGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function getRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/google/callback`
  );
}

/** Exchange the authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Google token exchange failed: ${resp.status} ${body}`);
  }

  return resp.json() as Promise<GoogleTokens>;
}

/** Fetch the user's profile from Google using the access token. */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const resp = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    throw new Error(`Google userinfo failed: ${resp.status}`);
  }

  const info = (await resp.json()) as GoogleUserInfo;

  if (!info.email_verified) {
    throw new Error("Google account email is not verified");
  }

  return info;
}

/** Generate a cryptographically random state string for CSRF protection. */
export function generateOAuthState(): string {
  const { randomBytes } = require("node:crypto") as typeof import("node:crypto");
  return randomBytes(24).toString("base64url");
}
