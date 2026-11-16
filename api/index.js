// server/app.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { desc, eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
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
  varchar
} from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var statusEnum = pgEnum("status", ["draft", "generated", "sent", "accepted", "expired"]);
var users = pgTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var panelTypes = pgTable(
  "panelTypes",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull().unique(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [index("panel_types_active_idx").on(table.isActive)]
);
var quotations = pgTable(
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
    createdBy: integer("createdBy").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    index("quotations_creator_idx").on(table.createdBy),
    index("quotations_created_idx").on(table.createdAt),
    index("quotations_status_idx").on(table.status),
    index("quotations_phone_idx").on(table.customerPhone),
    index("quotations_plant_size_idx").on(table.plantSizeKw)
  ]
);
var activityLogs = pgTable(
  "activityLogs",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: varchar("entityId", { length: 80 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    index("activity_logs_user_idx").on(table.userId),
    index("activity_logs_created_idx").on(table.createdAt)
  ]
);

// shared/quotation.ts
function calculatePlantSizeKw(panelWatt, numberOfPanels) {
  if (!Number.isFinite(panelWatt) || !Number.isFinite(numberOfPanels) || panelWatt <= 0 || numberOfPanels <= 0) {
    return 0;
  }
  return Number((panelWatt * numberOfPanels / 1e3).toFixed(2));
}
function normalizeIndianPhone(input) {
  const digits = input.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `91${digits.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}
function quotationNumberFor(year, sequence) {
  return `RS-${year}-${String(sequence).padStart(5, "0")}`;
}

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "roshni-solar-quotation",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
var client = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date(),
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user")
  };
  const existingByOpenId = await db.select({ id: users.id }).from(users).where(eq(users.openId, user.openId)).limit(1);
  if (!existingByOpenId[0] && values.email) {
    const pendingByEmail = await db.select({ id: users.id, openId: users.openId }).from(users).where(eq(users.email, values.email)).limit(1);
    if (pendingByEmail[0]?.openId.startsWith("pending:")) {
      await db.update(users).set({ openId: values.openId, name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, pendingByEmail[0].id));
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
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function getNextQuotationNumber(quotationDate = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const year = quotationDate.getFullYear();
  const prefix = `RS-${year}-`;
  const latest = await db.select({ quotationNumber: quotations.quotationNumber }).from(quotations).where(like(quotations.quotationNumber, `${prefix}%`)).orderBy(desc(quotations.quotationNumber)).limit(1);
  const currentSequence = latest[0]?.quotationNumber ? Number(latest[0].quotationNumber.slice(-5)) : 0;
  return quotationNumberFor(year, currentSequence + 1);
}
async function writeActivityLog(input) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values({
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    metadata: input.metadata ?? null
  });
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : String(forwardedProto).split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const isSecure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "none" : "lax",
    secure: isSecure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client2) {
    this.client = client2;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client2 = createOAuthHttpClient()) {
    this.client = client2;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret || "roshni-solar-quotation-secret-key-min-32-chars-long";
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const headers = req?.headers ?? {};
    const cookieHeader = typeof headers.cookie === "string" ? headers.cookie : void 0;
    const cookies = this.parseCookies(cookieHeader);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    if (!user.isActive) {
      throw ForbiddenError("Account disabled");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req?.query?.[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const headers = req.headers || {};
    const cookieHeader = typeof headers.cookie === "string" ? headers.cookie : "";
    const expectedNonce = parseCookieHeader2(cookieHeader)[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/routers.ts
import { eq as eq4 } from "drizzle-orm";
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z4 } from "zod";

// server/_core/passwords.ts
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
var scrypt = promisify(scryptCallback);
var KEY_LENGTH = 64;
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({ transformer: superjson });
var router = t.router;
var publicProcedure = t.procedure;
var requireActiveUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  if (!ctx.user.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Your account has been disabled." });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
var protectedProcedure = t.procedure.use(requireActiveUser);
var adminProcedure = t.procedure.use(requireActiveUser).use(
  t.middleware(async (opts) => {
    const user = opts.ctx.user;
    if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    return opts.next({ ctx: { ...opts.ctx, user } });
  })
);

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError2({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError2({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/admin.ts
import { desc as desc2, eq as eq2, gte, sql } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";
var adminRouter = router({
  dashboard: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    const now = /* @__PURE__ */ new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [quotationCount, customerCount, quotationValue, monthlyCount, recent] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(quotations),
      db.select({ count: sql`count(distinct ${quotations.customerPhone})` }).from(quotations),
      db.select({ total: sql`coalesce(sum(${quotations.plantCost}), 0)` }).from(quotations),
      db.select({ count: sql`count(*)` }).from(quotations).where(gte(quotations.createdAt, startOfMonth)),
      db.select({ quotation: quotations, creatorName: users.name }).from(quotations).leftJoin(users, eq2(quotations.createdBy, users.id)).orderBy(desc2(quotations.createdAt)).limit(6)
    ]);
    return {
      totals: {
        quotations: Number(quotationCount[0]?.count ?? 0),
        customers: Number(customerCount[0]?.count ?? 0),
        quotationValue: String(quotationValue[0]?.total ?? 0),
        thisMonth: Number(monthlyCount[0]?.count ?? 0)
      },
      recent
    };
  }),
  userOptions: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({ id: users.id, name: users.name, email: users.email, openId: users.openId, role: users.role, isActive: users.isActive }).from(users).orderBy(users.name, users.email, users.id);
  }),
  createUser: adminProcedure.input(z2.object({ name: z2.string().trim().min(2).max(120), email: z2.string().trim().email().max(320), password: z2.string().min(8).max(200), role: z2.enum(["admin", "user"]).default("user") })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    const email = input.email.toLowerCase();
    const existing = await db.select({ id: users.id }).from(users).where(eq2(users.email, email)).limit(1);
    if (existing[0]) throw new TRPCError3({ code: "CONFLICT", message: "An account with this email already exists." });
    const passwordHash = await hashPassword(input.password);
    const result = await db.insert(users).values({ openId: `password:${crypto.randomUUID()}`, name: input.name, email, passwordHash, loginMethod: "credentials", role: input.role, isActive: true }).returning({ id: users.id });
    await writeActivityLog({ userId: ctx.user.id, action: "user.created", entityType: "user", entityId: result[0].id, metadata: { email, role: input.role } });
    return { id: result[0].id };
  }),
  users: adminProcedure.input(z2.object({ page: z2.number().int().positive().default(1), pageSize: z2.number().int().positive().max(50).default(10) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    const [items, total] = await Promise.all([
      db.select().from(users).orderBy(desc2(users.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql`count(*)` }).from(users)
    ]);
    return { items, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  }),
  updateUser: adminProcedure.input(z2.object({ id: z2.number().int().positive(), name: z2.string().trim().min(2).max(120).optional(), email: z2.string().trim().email().max(320).optional(), password: z2.string().min(8).max(200).optional(), role: z2.enum(["admin", "user"]).optional(), isActive: z2.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const admin = ctx.user;
    if (input.id === admin.id && input.isActive === false) throw new TRPCError3({ code: "BAD_REQUEST", message: "You cannot disable your own account." });
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    const passwordHash = input.password ? await hashPassword(input.password) : void 0;
    await db.update(users).set({ name: input.name, email: input.email?.toLowerCase(), passwordHash, role: input.role, isActive: input.isActive }).where(eq2(users.id, input.id));
    await writeActivityLog({ userId: admin.id, action: input.password ? "user.password_reset" : "user.updated", entityType: "user", entityId: input.id, metadata: { name: input.name, email: input.email, role: input.role, isActive: input.isActive } });
    return { success: true };
  }),
  deleteUser: adminProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const admin = ctx.user;
    if (input.id === admin.id) throw new TRPCError3({ code: "BAD_REQUEST", message: "You cannot delete your own account." });
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(users).where(eq2(users.id, input.id));
    await writeActivityLog({ userId: admin.id, action: "user.deleted", entityType: "user", entityId: input.id });
    return { success: true };
  }),
  activity: adminProcedure.input(z2.object({ page: z2.number().int().positive().default(1), pageSize: z2.number().int().positive().max(50).default(10) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    const [items, total] = await Promise.all([
      db.select({ log: activityLogs, userName: users.name }).from(activityLogs).leftJoin(users, eq2(activityLogs.userId, users.id)).orderBy(desc2(activityLogs.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql`count(*)` }).from(activityLogs)
    ]);
    return { items, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  })
});

// server/routers/quotations.ts
import { and, desc as desc3, eq as eq3, gte as gte2, like as like2, lte, or, sql as sql2 } from "drizzle-orm";
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z3 } from "zod";
var quotationInput = z3.object({
  customerName: z3.string().trim().min(2).max(255),
  customerAddress: z3.string().trim().max(2e3).optional().or(z3.literal("")),
  customerPhone: z3.string().trim().min(10).max(30),
  panelName: z3.string().trim().min(2).max(120),
  panelType: z3.string().trim().min(2).max(80),
  panelTypeOther: z3.string().trim().max(120).optional().or(z3.literal("")),
  panelWatt: z3.coerce.number().int().positive().max(2e3),
  numberOfPanels: z3.coerce.number().int().positive().max(1e3),
  inverterCompany: z3.string().trim().min(2).max(120),
  plantCost: z3.coerce.number().positive().max(999999999),
  quotationDate: z3.coerce.date().optional(),
  status: z3.enum(["draft", "generated", "sent", "accepted", "expired"]).optional()
}).superRefine((value, context) => {
  if (!normalizeIndianPhone(value.customerPhone)) {
    context.addIssue({ code: z3.ZodIssueCode.custom, path: ["customerPhone"], message: "Enter a valid Indian mobile number." });
  }
  if (value.panelType === "Other" && !value.panelTypeOther?.trim()) {
    context.addIssue({ code: z3.ZodIssueCode.custom, path: ["panelTypeOther"], message: "Specify the panel type." });
  }
});
var searchInput = z3.object({
  query: z3.string().trim().optional(),
  status: z3.enum(["draft", "generated", "sent", "accepted", "expired"]).optional(),
  plantSize: z3.string().optional(),
  userId: z3.number().int().positive().optional(),
  dateFrom: z3.coerce.date().optional(),
  dateTo: z3.coerce.date().optional(),
  page: z3.number().int().positive().default(1),
  pageSize: z3.number().int().positive().max(50).default(10),
  sort: z3.enum(["newest", "oldest", "highest_cost", "lowest_cost", "customer_name"]).default("newest")
});
function scopeForUser(user) {
  return user.role === "admin" ? void 0 : eq3(quotations.createdBy, user.id);
}
var quotationRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
    const scope = scopeForUser(ctx.user);
    const now = /* @__PURE__ */ new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyScope = scope ? and(scope, gte2(quotations.createdAt, startOfMonth)) : gte2(quotations.createdAt, startOfMonth);
    const [quotationCount, customerCount, quotationValue, monthlyCount, recent] = await Promise.all([
      db.select({ count: sql2`count(*)` }).from(quotations).where(scope),
      db.select({ count: sql2`count(distinct ${quotations.customerPhone})` }).from(quotations).where(scope),
      db.select({ total: sql2`coalesce(sum(${quotations.plantCost}), 0)` }).from(quotations).where(scope),
      db.select({ count: sql2`count(*)` }).from(quotations).where(monthlyScope),
      db.select({ quotation: quotations, creatorName: users.name }).from(quotations).leftJoin(users, eq3(quotations.createdBy, users.id)).where(scope).orderBy(desc3(quotations.createdAt)).limit(6)
    ]);
    return {
      totals: {
        quotations: Number(quotationCount[0]?.count ?? 0),
        customers: Number(customerCount[0]?.count ?? 0),
        quotationValue: String(quotationValue[0]?.total ?? 0),
        thisMonth: Number(monthlyCount[0]?.count ?? 0)
      },
      recent
    };
  }),
  list: protectedProcedure.input(searchInput).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
    const conditions = [];
    const scope = scopeForUser(ctx.user);
    if (scope) conditions.push(scope);
    if (input.status) conditions.push(eq3(quotations.status, input.status));
    if (input.plantSize && input.plantSize !== "all") conditions.push(eq3(quotations.plantSizeKw, input.plantSize));
    if (input.userId && ctx.user.role === "admin") conditions.push(eq3(quotations.createdBy, input.userId));
    if (input.dateFrom) conditions.push(gte2(quotations.quotationDate, input.dateFrom));
    if (input.dateTo) {
      const inclusiveDate = new Date(input.dateTo);
      inclusiveDate.setHours(23, 59, 59, 999);
      conditions.push(lte(quotations.quotationDate, inclusiveDate));
    }
    if (input.query) {
      const term = `%${input.query}%`;
      conditions.push(or(like2(quotations.customerName, term), like2(quotations.customerPhone, term), like2(quotations.quotationNumber, term), like2(quotations.panelName, term)));
    }
    const where = conditions.length ? and(...conditions) : void 0;
    const orderBy = input.sort === "oldest" ? quotations.createdAt : input.sort === "highest_cost" ? desc3(quotations.plantCost) : input.sort === "lowest_cost" ? quotations.plantCost : input.sort === "customer_name" ? quotations.customerName : desc3(quotations.createdAt);
    const [items, total] = await Promise.all([
      db.select({ quotation: quotations, creatorName: users.name }).from(quotations).leftJoin(users, eq3(quotations.createdBy, users.id)).where(where).orderBy(orderBy).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql2`count(*)` }).from(quotations).where(where)
    ]);
    return { items, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  }),
  getById: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const scope = scopeForUser(ctx.user);
    const record = await db.select({ quotation: quotations, creatorName: users.name }).from(quotations).leftJoin(users, eq3(quotations.createdBy, users.id)).where(scope ? and(eq3(quotations.id, input.id), scope) : eq3(quotations.id, input.id)).limit(1);
    if (!record[0]) throw new TRPCError4({ code: "NOT_FOUND", message: "Quotation not found." });
    return record[0];
  }),
  create: protectedProcedure.input(quotationInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const quotationDate = input.quotationDate ?? /* @__PURE__ */ new Date();
    const normalizedPhone = normalizeIndianPhone(input.customerPhone);
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
      createdBy: ctx.user.id
    }).returning({ id: quotations.id });
    await writeActivityLog({ userId: ctx.user.id, action: "quotation.created", entityType: "quotation", entityId: result[0].id, metadata: { quotationNumber } });
    return { id: result[0].id, quotationNumber };
  }),
  update: protectedProcedure.input(z3.object({ id: z3.number().int().positive(), data: quotationInput })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const scope = scopeForUser(ctx.user);
    const existing = await db.select({ id: quotations.id }).from(quotations).where(scope ? and(eq3(quotations.id, input.id), scope) : eq3(quotations.id, input.id)).limit(1);
    if (!existing[0]) throw new TRPCError4({ code: "NOT_FOUND" });
    const plantSizeKw = calculatePlantSizeKw(input.data.panelWatt, input.data.numberOfPanels);
    await db.update(quotations).set({
      customerName: input.data.customerName,
      customerAddress: input.data.customerAddress || null,
      customerPhone: normalizeIndianPhone(input.data.customerPhone),
      panelName: input.data.panelName,
      panelType: input.data.panelType,
      panelTypeOther: input.data.panelTypeOther || null,
      panelWatt: input.data.panelWatt,
      numberOfPanels: input.data.numberOfPanels,
      plantSizeKw: String(plantSizeKw),
      inverterCompany: input.data.inverterCompany,
      plantCost: String(input.data.plantCost),
      quotationDate: input.data.quotationDate ?? void 0,
      status: input.data.status ?? "draft"
    }).where(eq3(quotations.id, input.id));
    await writeActivityLog({ userId: ctx.user.id, action: "quotation.updated", entityType: "quotation", entityId: input.id });
    return { success: true };
  }),
  delete: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const scope = scopeForUser(ctx.user);
    const result = await db.delete(quotations).where(scope ? and(eq3(quotations.id, input.id), scope) : eq3(quotations.id, input.id)).returning({ id: quotations.id });
    if (result.length === 0) throw new TRPCError4({ code: "NOT_FOUND" });
    await writeActivityLog({ userId: ctx.user.id, action: "quotation.deleted", entityType: "quotation", entityId: input.id });
    return { success: true };
  }),
  markGenerated: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const scope = scopeForUser(ctx.user);
    await db.update(quotations).set({ status: "generated", pdfGeneratedAt: /* @__PURE__ */ new Date() }).where(scope ? and(eq3(quotations.id, input.id), scope) : eq3(quotations.id, input.id));
    await writeActivityLog({ userId: ctx.user.id, action: "quotation.generated", entityType: "quotation", entityId: input.id });
    return { success: true };
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user ?? null),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    credentialLogin: publicProcedure.input(z4.object({ loginId: z4.string().trim().email().max(320), password: z4.string().min(8).max(200) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError5({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database is not available. Please verify DATABASE_URL is configured in environment variables."
        });
      }
      const loginId = input.loginId.toLowerCase();
      let account;
      try {
        account = await db.select().from(users).where(eq4(users.email, loginId)).limit(1);
      } catch (dbErr) {
        console.error("[Login] Database query error:", dbErr);
        throw new TRPCError5({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database error: ${dbErr?.message || "Failed to query users table"}. Check database configuration and schema.`
        });
      }
      const user = account[0];
      if (!user || !user.isActive || !await verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError5({
          code: "UNAUTHORIZED",
          message: "Invalid login ID or password."
        });
      }
      const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || user.email || "Roshni user", expiresInMs: ONE_YEAR_MS });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      try {
        await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date(), loginMethod: "credentials" }).where(eq4(users.id, user.id));
      } catch (err) {
        console.warn("[Login] Could not update lastSignedIn:", err);
      }
      return { success: true, redirectTo: user.role === "admin" ? "/admin/dashboard" : "/home" };
    })
  }),
  quotations: quotationRouter,
  admin: adminRouter
});

// server/app.ts
function createProductionApp() {
  const app2 = express();
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  app2.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  app2.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });
  return app2;
}

// server/api.ts
var app = createProductionApp();
function handler(req, res) {
  const requestUrl = new URL(req.url ?? "/", "http://vercel.local");
  const originalPath = requestUrl.searchParams.get("__path");
  if (originalPath?.startsWith("/api/")) {
    requestUrl.searchParams.delete("__path");
    req.url = `${originalPath}${requestUrl.search}`;
  } else if (!req.url?.startsWith("/api") && !req.url?.startsWith("/manus-storage")) {
    req.url = `/api${req.url?.startsWith("/") ? "" : "/"}${req.url ?? ""}`;
  }
  return app(req, res);
}
export {
  handler as default
};
