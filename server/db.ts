import { desc, eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { activityLogs, InsertUser, quotations, users } from "../drizzle/schema";
import { quotationNumberFor } from "../shared/quotation";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let client: postgres.Sql | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      client = postgres(process.env.DATABASE_URL, { prepare: false });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
  };

  const existingByOpenId = await db.select({ id: users.id }).from(users).where(eq(users.openId, user.openId)).limit(1);
  if (!existingByOpenId[0] && values.email) {
    const pendingByEmail = await db.select({ id: users.id, openId: users.openId }).from(users).where(eq(users.email, values.email)).limit(1);
    if (pendingByEmail[0]?.openId.startsWith("pending:")) {
      await db.update(users).set({ openId: values.openId, name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn, updatedAt: new Date() }).where(eq(users.id, pendingByEmail[0].id));
      return;
    }
  }
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      lastSignedIn: values.lastSignedIn,
      updatedAt: new Date(),
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getNextQuotationNumber(quotationDate = new Date()): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const year = quotationDate.getFullYear();
  const prefix = `RS-${year}-`;
  const latest = await db
    .select({ quotationNumber: quotations.quotationNumber })
    .from(quotations)
    .where(like(quotations.quotationNumber, `${prefix}%`))
    .orderBy(desc(quotations.quotationNumber))
    .limit(1);
  const currentSequence = latest[0]?.quotationNumber ? Number(latest[0].quotationNumber.slice(-5)) : 0;
  return quotationNumberFor(year, currentSequence + 1);
}

export async function writeActivityLog(input: {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values({
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    metadata: input.metadata ?? null,
  });
}
