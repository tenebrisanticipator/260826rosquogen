import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { users } from "../drizzle/schema.js";
import { getDb } from "./db.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { verifyPassword } from "./_core/passwords.js";
import { sdk } from "./_core/sdk.js";
import { publicProcedure, router } from "./_core/trpc.js";
import { systemRouter } from "./_core/systemRouter.js";
import { adminRouter } from "./routers/admin.js";
import { quotationRouter } from "./routers/quotations.js";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ?? null),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 } as any);
      return { success: true } as const;
    }),
    credentialLogin: publicProcedure.input(z.object({ loginId: z.string().trim().email().max(320), password: z.string().min(8).max(200) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database is not available. Please verify DATABASE_URL is configured in environment variables.",
        });
      }
      const loginId = input.loginId.toLowerCase();
      let account;
      try {
        account = await db.select().from(users).where(eq(users.email, loginId)).limit(1);
      } catch (dbErr: any) {
        console.error("[Login] Database query error:", dbErr);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database error: ${dbErr?.message || "Failed to query users table"}. Check database configuration and schema.`,
        });
      }
      const user = account[0];
      if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid login ID or password.",
        });
      }
      const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || user.email || "Roshni user", expiresInMs: ONE_YEAR_MS });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS } as any);
      try {
        await db.update(users).set({ lastSignedIn: new Date(), loginMethod: "credentials" }).where(eq(users.id, user.id));
      } catch (err) {
        console.warn("[Login] Could not update lastSignedIn:", err);
      }
      return { success: true, redirectTo: user.role === "admin" ? "/admin/dashboard" : "/home" } as const;
    }),
  }),
  quotations: quotationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
