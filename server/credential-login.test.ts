import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { hashPassword } from "./_core/passwords";
import { COOKIE_NAME } from "../shared/const";

const getDb = vi.fn();
const createSessionToken = vi.fn();
vi.mock("./db", () => ({ getDb }));
vi.mock("./_core/sdk", () => ({ sdk: { createSessionToken } }));

const { appRouter } = await import("./routers");

function publicContext() {
  const cookies: Array<{ name: string; value: string }> = [];
  const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie: (name: string, value: string) => { cookies.push({ name, value }); } } as TrpcContext["res"] };
  return { ctx, cookies };
}

describe("credential login", () => {
  beforeEach(() => { getDb.mockReset(); createSessionToken.mockReset(); createSessionToken.mockResolvedValue("signed-session"); });

  it("issues the standard session cookie only after exact password verification", async () => {
    const passwordHash = await hashPassword("ExactPassword#8");
    const where = vi.fn().mockResolvedValue(undefined); const set = vi.fn(() => ({ where }));
    const account = { id: 5, openId: "password:staff", name: "Staff", email: "staff@example.com", passwordHash, loginMethod: "credentials", role: "user" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    getDb.mockResolvedValue({ select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: async () => [account] }) }) })), update: vi.fn(() => ({ set })) });
    const { ctx, cookies } = publicContext();
    await expect(appRouter.createCaller(ctx).auth.credentialLogin({ loginId: "STAFF@example.com", password: "ExactPassword#8" })).resolves.toEqual({ success: true, redirectTo: "/home" });
    expect(createSessionToken).toHaveBeenCalledWith("password:staff", expect.any(Object));
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, value: "signed-session" });
  });

  it("rejects a wrong password without setting a session cookie", async () => {
    const passwordHash = await hashPassword("ExactPassword#8");
    const account = { id: 5, openId: "password:staff", name: "Staff", email: "staff@example.com", passwordHash, loginMethod: "credentials", role: "user" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    getDb.mockResolvedValue({ select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: async () => [account] }) }) })) });
    const { ctx, cookies } = publicContext();
    await expect(appRouter.createCaller(ctx).auth.credentialLogin({ loginId: "staff@example.com", password: "WrongPassword#8" })).rejects.toThrow("Invalid login ID or password.");
    expect(cookies).toHaveLength(0);
  });

  it("returns the administrator dashboard destination for an administrator credential", async () => {
    const passwordHash = await hashPassword("AdminPassword#8");
    const where = vi.fn().mockResolvedValue(undefined); const set = vi.fn(() => ({ where }));
    const account = { id: 1, openId: "password:admin", name: "Admin", email: "admin@example.com", passwordHash, loginMethod: "credentials", role: "admin" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    getDb.mockResolvedValue({ select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: async () => [account] }) }) })), update: vi.fn(() => ({ set })) });
    const { ctx } = publicContext();
    await expect(appRouter.createCaller(ctx).auth.credentialLogin({ loginId: "admin@example.com", password: "AdminPassword#8" })).resolves.toEqual({ success: true, redirectTo: "/admin/dashboard" });
  });
});
