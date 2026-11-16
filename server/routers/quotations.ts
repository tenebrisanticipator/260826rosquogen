import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { quotations, users } from "../../drizzle/schema.js";
import { calculatePlantSizeKw, normalizeIndianPhone } from "../../shared/quotation.js";
import { getDb, getNextQuotationNumber, writeActivityLog } from "../db.js";
import { protectedProcedure, router } from "../_core/trpc.js";

const quotationInput = z
  .object({
    customerName: z.string().trim().min(2).max(255),
    customerAddress: z.string().trim().max(2000).optional().or(z.literal("")),
    customerPhone: z.string().trim().min(10).max(30),
    panelName: z.string().trim().min(2).max(120),
    panelType: z.string().trim().min(2).max(80),
    panelTypeOther: z.string().trim().max(120).optional().or(z.literal("")),
    panelWatt: z.coerce.number().int().positive().max(2000),
    numberOfPanels: z.coerce.number().int().positive().max(1000),
    inverterCompany: z.string().trim().min(2).max(120),
    plantCost: z.coerce.number().positive().max(999999999),
    quotationDate: z.coerce.date().optional(),
    status: z.enum(["draft", "generated", "sent", "accepted", "expired"]).optional(),
  })
  .superRefine((value, context) => {
    if (!normalizeIndianPhone(value.customerPhone)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["customerPhone"], message: "Enter a valid Indian mobile number." });
    }
    if (value.panelType === "Other" && !value.panelTypeOther?.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["panelTypeOther"], message: "Specify the panel type." });
    }
  });

const searchInput = z.object({
  query: z.string().trim().optional(),
  status: z.enum(["draft", "generated", "sent", "accepted", "expired"]).optional(),
  plantSize: z.string().optional(),
  userId: z.number().int().positive().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(50).default(10),
  sort: z.enum(["newest", "oldest", "highest_cost", "lowest_cost", "customer_name"]).default("newest"),
});

export function scopeForUser(user: { id: number; role: "admin" | "user" }) {
  return user.role === "admin" ? undefined : eq(quotations.createdBy, user.id);
}

export const quotationRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
    const scope = scopeForUser(ctx.user);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyScope = scope ? and(scope, gte(quotations.createdAt, startOfMonth)) : gte(quotations.createdAt, startOfMonth);
    const [quotationCount, customerCount, quotationValue, monthlyCount, recent] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(quotations).where(scope),
      db.select({ count: sql<number>`count(distinct ${quotations.customerPhone})` }).from(quotations).where(scope),
      db.select({ total: sql<string>`coalesce(sum(${quotations.plantCost}), 0)` }).from(quotations).where(scope),
      db.select({ count: sql<number>`count(*)` }).from(quotations).where(monthlyScope),
      db.select({ quotation: quotations, creatorName: users.name }).from(quotations).leftJoin(users, eq(quotations.createdBy, users.id)).where(scope).orderBy(desc(quotations.createdAt)).limit(6),
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
  list: protectedProcedure.input(searchInput).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
    const conditions = [];
    const scope = scopeForUser(ctx.user);
    if (scope) conditions.push(scope);
    if (input.status) conditions.push(eq(quotations.status, input.status));
    if (input.plantSize && input.plantSize !== "all") conditions.push(eq(quotations.plantSizeKw, input.plantSize));
    if (input.userId && ctx.user.role === "admin") conditions.push(eq(quotations.createdBy, input.userId));
    if (input.dateFrom) conditions.push(gte(quotations.quotationDate, input.dateFrom));
    if (input.dateTo) {
      const inclusiveDate = new Date(input.dateTo);
      inclusiveDate.setHours(23, 59, 59, 999);
      conditions.push(lte(quotations.quotationDate, inclusiveDate));
    }
    if (input.query) {
      const term = `%${input.query}%`;
      conditions.push(or(like(quotations.customerName, term), like(quotations.customerPhone, term), like(quotations.quotationNumber, term), like(quotations.panelName, term))!);
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const orderBy = input.sort === "oldest"
      ? quotations.createdAt
      : input.sort === "highest_cost"
        ? desc(quotations.plantCost)
        : input.sort === "lowest_cost"
          ? quotations.plantCost
          : input.sort === "customer_name"
            ? quotations.customerName
            : desc(quotations.createdAt);
    const [items, total] = await Promise.all([
      db.select({ quotation: quotations, creatorName: users.name }).from(quotations).leftJoin(users, eq(quotations.createdBy, users.id)).where(where).orderBy(orderBy).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)` }).from(quotations).where(where),
    ]);
    return { items, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  }),

  getById: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const scope = scopeForUser(ctx.user);
    const record = await db.select({ quotation: quotations, creatorName: users.name }).from(quotations).leftJoin(users, eq(quotations.createdBy, users.id)).where(scope ? and(eq(quotations.id, input.id), scope) : eq(quotations.id, input.id)).limit(1);
    if (!record[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found." });
    return record[0];
  }),

  create: protectedProcedure.input(quotationInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const quotationDate = input.quotationDate ?? new Date();
    const normalizedPhone = normalizeIndianPhone(input.customerPhone)!;
    const plantSizeKw = calculatePlantSizeKw(input.panelWatt, input.numberOfPanels);
    const quotationNumber = await getNextQuotationNumber(quotationDate);
    const result = await db.insert(quotations).values({
      quotationNumber,
      customerName: input.customerName,
      customerAddress: input.customerAddress || null,
      customerPhone: normalizedPhone,
      panelName: input.panelName,
      panelType: input.panelType,
      panelTypeOther: input.panelTypeOther || null,
      panelWatt: input.panelWatt,
      numberOfPanels: input.numberOfPanels,
      plantSizeKw: String(plantSizeKw),
      inverterCompany: input.inverterCompany,
      plantCost: String(input.plantCost),
      quotationDate,
      status: input.status ?? "draft",
      createdBy: ctx.user.id,
    }).returning({ id: quotations.id });
    await writeActivityLog({ userId: ctx.user.id, action: "quotation.created", entityType: "quotation", entityId: result[0].id, metadata: { quotationNumber } });
    return { id: result[0].id, quotationNumber };
  }),

  update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: quotationInput })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const scope = scopeForUser(ctx.user);
    const existing = await db.select({ id: quotations.id }).from(quotations).where(scope ? and(eq(quotations.id, input.id), scope) : eq(quotations.id, input.id)).limit(1);
    if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" });
    const plantSizeKw = calculatePlantSizeKw(input.data.panelWatt, input.data.numberOfPanels);
    await db.update(quotations).set({
      customerName: input.data.customerName,
      customerAddress: input.data.customerAddress || null,
      customerPhone: normalizeIndianPhone(input.data.customerPhone)!,
      panelName: input.data.panelName,
      panelType: input.data.panelType,
      panelTypeOther: input.data.panelTypeOther || null,
      panelWatt: input.data.panelWatt,
      numberOfPanels: input.data.numberOfPanels,
      plantSizeKw: String(plantSizeKw),
      inverterCompany: input.data.inverterCompany,
      plantCost: String(input.data.plantCost),
      quotationDate: input.data.quotationDate ?? undefined,
      status: input.data.status ?? "draft",
    }).where(eq(quotations.id, input.id));
    await writeActivityLog({ userId: ctx.user.id, action: "quotation.updated", entityType: "quotation", entityId: input.id });
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const scope = scopeForUser(ctx.user);
    const result = await db.delete(quotations).where(scope ? and(eq(quotations.id, input.id), scope) : eq(quotations.id, input.id)).returning({ id: quotations.id });
    if (result.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
    await writeActivityLog({ userId: ctx.user.id, action: "quotation.deleted", entityType: "quotation", entityId: input.id });
    return { success: true };
  }),

  markGenerated: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const scope = scopeForUser(ctx.user);
    await db.update(quotations).set({ status: "generated", pdfGeneratedAt: new Date() }).where(scope ? and(eq(quotations.id, input.id), scope) : eq(quotations.id, input.id));
    await writeActivityLog({ userId: ctx.user.id, action: "quotation.generated", entityType: "quotation", entityId: input.id });
    return { success: true };
  }),
});
