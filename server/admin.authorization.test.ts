import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 1, openId: "test-user", name: "Test User", email: "test@example.com", loginMethod: "test", role, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin authorization", () => {
  it("rejects normal users before an administrator procedure reaches the database", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.users()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects normal users before pending-account creation reaches the database", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.createUser({ name: "Sales User", email: "sales@example.com", password: "SecurePass123", role: "user" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects normal users before a password-reset attempt reaches the database", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.updateUser({ id: 2, password: "SecurePass123" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
