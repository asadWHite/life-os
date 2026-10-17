import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { MIGRATION_SQL } from "./migration-sql";

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/*                                                                     */
/* Accepts DATABASE_URL plus the names Vercel/Neon/Supabase inject     */
/* (POSTGRES_URL / POSTGRES_URL_NON_POOLING). Nothing throws at        */
/* import time — builds must succeed before env vars are provisioned.  */
/* ------------------------------------------------------------------ */

const rawDatabaseUrl =
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DB_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.SUPABASE ??
  process.env["supabase"];

function isLocalHost(url: string): boolean {
  return /(@|\/\/)(localhost|127\.0\.0\.1)(:|\/)/.test(url);
}

function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Vercel/Supabase URLs may include provider-specific hints that should not
    // be forwarded as PostgreSQL startup parameters.
    parsed.searchParams.delete("supa");
    if (!isLocalHost(url) && !parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }
    return parsed.toString();
  } catch {
    if (isLocalHost(url) || /sslmode=/.test(url)) return url;
    return url + (url.includes("?") ? "&" : "?") + "sslmode=require";
  }
}

const databaseUrl = rawDatabaseUrl ? normalizeDatabaseUrl(rawDatabaseUrl) : null;

const globalForDb = globalThis as typeof globalThis & {
  __lifeosPool?: Pool;
  __lifeosSchemaPromise?: Promise<boolean>;
};

export const pool = databaseUrl
  ? (globalForDb.__lifeosPool ??
    (globalForDb.__lifeosPool = new Pool({
      connectionString: databaseUrl,
      max: 4,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    })))
  : null;

/**
 * NOTE: `db` may be null when no database URL is configured. Callers must
 * funnel through `getCurrentUser()`/actions, which guard on
 * `dbConfigured()` + `ensureSchema()` before issuing queries.
 */
export const db = (pool ? drizzle(pool) : null) as ReturnType<typeof drizzle>;

/* ------------------------------------------------------------------ */
/* Schema bootstrap                                                    */
/*                                                                     */
/* On first DB use (per cold start) the schema is ensured: tables and  */
/* constraints are created idempotently. This makes a fresh managed    */
/* database (Neon/Supabase) fully functional without a manual          */
/* migration step.                                                     */
/* ------------------------------------------------------------------ */

const TOLERABLE = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object (constraint / index)
  "42P06", // duplicate_schema
]);

export function ensureSchema(): Promise<boolean> {
  if (!pool) return Promise.resolve(false);
  globalForDb.__lifeosSchemaPromise ??= (async () => {
    try {
      const check = await pool!.query(`SELECT to_regclass('public.users') AS t`);
      if (check.rows[0]?.t) return true;
      const statements = MIGRATION_SQL.split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        try {
          await pool!.query(stmt);
        } catch (e) {
          const code = (e as { code?: string }).code ?? "";
          if (!TOLERABLE.has(code)) throw e;
        }
      }
      return true;
    } catch (e) {
      delete globalForDb.__lifeosSchemaPromise; // retry next request
      console.error("[lifeos] schema bootstrap failed:", e);
      return false;
    }
  })();
  return globalForDb.__lifeosSchemaPromise;
}

export function dbConfigured(): boolean {
  return !!databaseUrl;
}
