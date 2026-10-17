/* Proves: on a completely empty database the app self-provisions its schema. */
import { db, ensureSchema, dbConfigured } from "../src/db/index";
import { users, preferences, sleepSchedules } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

const ok = dbConfigured();
console.log("configured:", ok);
const ready = await ensureSchema();
console.log("schema ready:", ready);

// second call must be a fast no-op
const ready2 = await ensureSchema();
console.log("idempotent second call:", ready2);

const tables = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`);
console.log("tables:", tables.rows.map((r) => (r as { table_name: string }).table_name).join(","));

const [u] = await db.insert(users).values({ email: `boot_${Date.now()}@t.dev`, passwordHash: "x", firstName: "Boot" }).returning();
await db.insert(preferences).values({ userId: u.id }).onConflictDoNothing();
await db.insert(sleepSchedules).values({ userId: u.id }).onConflictDoNothing();
const count = await db.select().from(users).where(eq(users.id, u.id));
console.log("insert+read user:", count.length === 1 ? "OK" : "FAIL");

// partial unique index present?
const idx = await db.execute(sql`SELECT indexname FROM pg_indexes WHERE indexname='sleep_one_active_per_user'`);
console.log("partial unique index:", idx.rows.length === 1 ? "OK" : "MISSING");
await db.delete(users).where(eq(users.id, u.id));
process.exit(0);
