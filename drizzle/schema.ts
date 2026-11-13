import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Define PostgreSQL enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["draft", "generated", "sent", "accepted", "expired"]);

/** Core identity records are supplied by the built-in secure sign-in flow. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const panelTypes = pgTable(
  "panelTypes",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull().unique(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("panel_types_active_idx").on(table.isActive)],
);

export const quotations = pgTable(
  "quotations",
  {
    id: serial("id").primaryKey(),
    quotationNumber: varchar("quotationNumber", { length: 32 }).notNull().unique(),
    customerName: varchar("customerName", { length: 255 }).notNull(),
    customerAddress: text("customerAddress"),
    customerPhone: varchar("customerPhone", { length: 18 }).notNull(),
    panelName: varchar("panelName", { length: 120 }).notNull(),
    panelType: varchar("panelType", { length: 80 }).notNull(),
    panelTypeOther: varchar("panelTypeOther", { length: 120 }),
    panelWatt: integer("panelWatt").notNull(),
    numberOfPanels: integer("numberOfPanels").notNull(),
    plantSizeKw: decimal("plantSizeKw", { precision: 8, scale: 2 }).notNull(),
    inverterCompany: varchar("inverterCompany", { length: 120 }).notNull(),
    plantCost: decimal("plantCost", { precision: 14, scale: 2 }).notNull(),
    quotationDate: timestamp("quotationDate").defaultNow().notNull(),
    status: statusEnum("status").default("draft").notNull(),
    pdfStorageKey: varchar("pdfStorageKey", { length: 500 }),
    pdfUrl: text("pdfUrl"),
    pdfGeneratedAt: timestamp("pdfGeneratedAt"),
    createdBy: integer("createdBy")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("quotations_creator_idx").on(table.createdBy),
    index("quotations_created_idx").on(table.createdAt),
    index("quotations_status_idx").on(table.status),
    index("quotations_phone_idx").on(table.customerPhone),
    index("quotations_plant_size_idx").on(table.plantSizeKw),
  ],
);

export const activityLogs = pgTable(
  "activityLogs",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: varchar("entityId", { length: 80 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("activity_logs_user_idx").on(table.userId),
    index("activity_logs_created_idx").on(table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
