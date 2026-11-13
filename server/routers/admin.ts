import { desc, eq, gte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { activityLogs, quotations, users } from "../../drizzle/schema";
import { getDb, writeActivityLog } from "../db";
import { adminProcedure, router } from "../_core/trpc";
import { hashPassword } from "../_core/passwords";

export const adminRouter = router({
  dashboard: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [quotationCount, customerCount, quotationValue, monthlyCount, recent] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(quotations),
      db.select({ count: sql<number>`count(distinct ${quotations.customerPhone})` }).from(quotations),
      db.select({ total: sql<string>`coalesce(sum(${quotations.plantCost}), 0)` }).from(quotations),
      db.select({ count: sql<number>`count(*)` }).from(quotations).where(gte(quotations.createdAt, startOfMonth)),
      db.select({ quotation: quotations, creatorName: users.name }).from(quotations).leftJoin(users, eq(quotations.createdBy, users.id)).orderBy(desc(quotations.createdAt)).limit(6),
    ]);
    return {
      totals: {
        quotations: Number(quotationCount[0]?.count ?? 0),
        customers: Number(customerCount[0]?.count ?? 0),
        quotationValue: String(quotationValue[0]?.total ?? 0),
        thisMonth: Number(monthlyCount[0]?.count ?? 0),
      },
      recent,
    };
  }),

  userOptions: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({ id: users.id, name: users.name, email: users.email, openId: users.openId, role: users.role, isActive: users.isActive }).from(users).orderBy(users.name, users.email, users.id);
  }),

  createUser: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), password: z.string().min(8).max(200), role: z.enum(["admin", "user"]).default("user") })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const email = input.email.toLowerCase();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
    const passwordHash = await hashPassword(input.password);
    const result = await db.insert(users).values({ openId: `password:${crypto.randomUUID()}`, name: input.name, email, passwordHash, loginMethod: "credentials", role: input.role, isActive: true }).returning({ id: users.id });
    await writeActivityLog({ userId: ctx.user!.id, action: "user.created", entityType: "user", entityId: result[0].id, metadata: { email, role: input.role } });
    return { id: result[0].id };
  }),

  users: adminProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().positive().max(50).default(10) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [items, total] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)` }).from(users),
    ]);
    return { items, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  }),

  updateUser: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(120).optional(), email: z.string().trim().email().max(320).optional(), password: z.string().min(8).max(200).optional(), role: z.enum(["admin", "user"]).optional(), isActive: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const admin = ctx.user!;
    if (input.id === admin.id && input.isActive === false) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot disable your own account." });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    await db.update(users).set({ name: input.name, email: input.email?.toLowerCase(), passwordHash, role: input.role, isActive: input.isActive }).where(eq(users.id, input.id));
    await writeActivityLog({ userId: admin.id, action: input.password ? "user.password_reset" : "user.updated", entityType: "user", entityId: input.id, metadata: { name: input.name, email: input.email, role: input.role, isActive: input.isActive } });
    return { success: true };
  }),

  deleteUser: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const admin = ctx.user!;
    if (input.id === admin.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account." });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(users).where(eq(users.id, input.id));
    await writeActivityLog({ userId: admin.id, action: "user.deleted", entityType: "user", entityId: input.id });
    return { success: true };
  }),

  activity: adminProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().positive().max(50).default(10) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [items, total] = await Promise.all([
      db.select({ log: activityLogs, userName: users.name }).from(activityLogs).leftJoin(users, eq(activityLogs.userId, users.id)).orderBy(desc(activityLogs.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)` }).from(activityLogs),
    ]);
    return { items, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  }),
});
