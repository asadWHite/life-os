# Deployment — Life OS on Vercel

**Live URL:** https://life-os-cyan-sigma.vercel.app
**Repo:** https://github.com/asadWHite/life-os

Current state: the web app builds and runs on Vercel. Pages, auth guards,
404s, i18n and redirects all verified. `/api/health` reports
`DATABASE_URL not configured` until a production Postgres is attached —
that is the single remaining step (2 minutes, no code change needed).

## Oxirgi qadam (UZ) — ma'lumotlar bazasini ulash

1. https://vercel.com/asadwhite/life-os saytiga kiring.
2. **Storage** → **Create Database** → **Neon Postgres** (Free) → region `iad1` → **Create**.
3. Bazani **life-os** loyihasiga **Connect** qiling — Vercel `POSTGRES_URL`
   o'zgaruvchisini avtomatik kiritadi (kod uni avtomatik o'qiydi).
4. **Deployments** → so'nggi deploy → **⋮ → Redeploy**.
5. Tayyor: ilova birinchi so'rovda jadvallarni **o'zi avtomatik yaratadi**.
   Tekshirish: https://life-os-cyan-sigma.vercel.app/api/health → `{"ok":true}`.

Alternativa: istalgan Postgres (Neon/Supabase) manzilini Project → Settings →
**Environment Variables** → `DATABASE_URL` sifatida qo'ysangiz ham bo'ladi.

## Final step (EN)

1. Open the Vercel project → **Storage** → **Create Database** → **Neon Postgres** (Free).
2. Connect it to the `life-os` project — Vercel injects `POSTGRES_URL`
   (the code reads it automatically; `DATABASE_URL` also works).
3. Redeploy. The app **self-bootstraps its schema** on first request
   (11 tables + the partial unique index), idempotently.
4. Verify: `/api/health` returns `{"ok":true}`.

## Why this is one manual click

Vercel marketplace integrations (Neon etc.) can only be installed through an
interactive OAuth flow in the dashboard — access tokens cannot create them
via the REST API (verified: `POST /v1/storage/*` and
`POST /v2/integrations/*` return not_found without an installed integration).
Everything else — repo, project, production deploy, protection settings — is
fully automated.

## Security notes

- `.env` is gitignored/vercelignored; no secrets are committed.
- The tokens used for this deployment were shared in plain text — **rotate
  both** (GitHub PAT + Vercel token) after confirming everything works.
