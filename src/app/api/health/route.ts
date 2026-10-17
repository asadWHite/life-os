import { db, dbConfigured, ensureSchema } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!dbConfigured()) {
      return Response.json(
        {
          ok: false,
          reason: "No database env configured. Supported names: DATABASE_URL, SUPABASE_DB_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING, SUPABASE, supabase.",
        },
        { status: 500 },
      );
    }
    const ready = await ensureSchema();
    await db.execute(sql`select 1`);
    return Response.json({ ok: ready });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        reason: error instanceof Error ? error.message : "unknown_database_error",
      },
      { status: 500 },
    );
  }
}
