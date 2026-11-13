CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'generated', 'sent', 'accepted', 'expired');--> statement-breakpoint
CREATE TABLE "activityLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"action" varchar(100) NOT NULL,
	"entityType" varchar(80) NOT NULL,
	"entityId" varchar(80),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "panelTypes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "panelTypes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotationNumber" varchar(32) NOT NULL,
	"customerName" varchar(255) NOT NULL,
	"customerAddress" text,
	"customerPhone" varchar(18) NOT NULL,
	"panelName" varchar(120) NOT NULL,
	"panelType" varchar(80) NOT NULL,
	"panelTypeOther" varchar(120),
	"panelWatt" integer NOT NULL,
	"numberOfPanels" integer NOT NULL,
	"plantSizeKw" numeric(8, 2) NOT NULL,
	"inverterCompany" varchar(120) NOT NULL,
	"plantCost" numeric(14, 2) NOT NULL,
	"quotationDate" timestamp DEFAULT now() NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"pdfStorageKey" varchar(500),
	"pdfUrl" text,
	"pdfGeneratedAt" timestamp,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_quotationNumber_unique" UNIQUE("quotationNumber")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activityLogs" ADD CONSTRAINT "activityLogs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_user_idx" ON "activityLogs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "activity_logs_created_idx" ON "activityLogs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "panel_types_active_idx" ON "panelTypes" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "quotations_creator_idx" ON "quotations" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "quotations_created_idx" ON "quotations" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotations_phone_idx" ON "quotations" USING btree ("customerPhone");--> statement-breakpoint
CREATE INDEX "quotations_plant_size_idx" ON "quotations" USING btree ("plantSizeKw");