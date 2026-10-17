# Life OS — Personal Life Management Ecosystem (Web MVP)

A premium, calm personal operating system: daily command center, tasks, habits,
goals, sleep-routine tracking, the signature **focus lamp**, real progress
statistics, and rule-based achievements.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4** (CSS-first design tokens, light/dark, Liquid Glass surfaces)
- **PostgreSQL** via **Drizzle ORM**
- **zod** validation on every server action
- Custom session auth (scrypt password hashing, hashed session tokens in DB,
  httpOnly cookies) — no external auth service required

## Run locally

```bash
npm install
# requires DATABASE_URL (see .env)
npx drizzle-kit push            # create tables
# one-time extra integrity index (also executed once per environment):
psql "$DATABASE_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS sleep_one_active_per_user ON sleep_sessions (user_id) WHERE ended_at IS NULL AND state = 'active';"
npm run build && npm start      # or: npm run dev
```

## Tests

```bash
npx tsx scripts/logic-tests.mjs                        # 48 domain-logic tests (sleep rules, streaks, achievements, tz math)
npx tsx --env-file=.env scripts/integration-tests.mts  # 19 DB tests (auth hashing, session/SQL integrity, cascades)
```

## Verified flows

- Sign up → onboarding (5 resumable steps) → rules-based starter plan → Today.
- Tasks: create / edit / complete / reopen / soft-delete / move date; statistics
  recompute from the *same* pure functions everywhere (Today, Plan, Progress).
- Sleep: schedule with overnight duration math (22:30→06:30 = 8h); start/wake
  sessions persist across refresh; duplicate active sessions blocked by a
  partial unique index; accidental records are *discarded* (never rewritten).
  Status rules: **<2h red (priority)** · **≥target green** · **≥75% yellow** ·
  **<75% red**; bedtime & wake consistency measured separately.
- Focus lamp: schedule in local time (DST-tested), derived active/inactive
  state re-checked against stored timestamps (refresh-safe, no accumulated
  intervals); shows the real linked task; sessions ended after 15+ min count.
- Achievements: deterministic rules in `src/lib/achievements.ts`, unlocks keyed
  by (user, code) — refresh/re-complete can never double-award.
- Three languages (uz default / en / ru), appearance (light/dark/system),
  timezone-aware day boundaries.
- Account deletion cascades every user row.

## Known limitations (honest)

- **Web reminders** can only fire while a page is open; browsers block
  background timers. The UI states this and requests notification permission.
- Password reset by email is not implemented (no SMTP in this environment).
- Single-region local PostgreSQL; no external row-level-security layer — access
  control is enforced in validated server actions (every mutation checks
  ownership). Supabase/RLS would replace this in a Supabase deployment.
- No AI: "Brain" suggestions are transparent rules, labelled as such.

## Roadmap

Phase 2–5 per spec: verification hardening, PWA polish, then shared-logic
Flutter apps for Android and iOS against the same backend.
