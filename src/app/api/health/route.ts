import { db, dbConfigured, ensureSchema } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!dbConfigured()) {
      return Response.json({ ok: false, reason: "DATABASE_URL not configured" }, { status: 500 });
    }
    const ready = await ensureSchema();
    await db.execute(sql`select 1`);
    return Response.json({ ok: ready });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
