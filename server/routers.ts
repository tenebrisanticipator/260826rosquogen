import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import { eq } from "drizzle-orm";
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
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    credentialLogin: publicProcedure.input(z.object({ loginId: z.string().trim().email().max(320), password: z.string().min(8).max(200) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database is not available");
      const loginId = input.loginId.toLowerCase();
      const account = await db.select().from(users).where(eq(users.email, loginId)).limit(1);
      const user = account[0];
      if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new Error("Invalid login ID or password.");
      }
      const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || user.email || "Roshni user", expiresInMs: ONE_YEAR_MS });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      await db.update(users).set({ lastSignedIn: new Date(), loginMethod: "credentials" }).where(eq(users.id, user.id));
      return { success: true, redirectTo: user.role === "admin" ? "/admin/dashboard" : "/home" } as const;
    }),
  }),
  quotations: quotationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
