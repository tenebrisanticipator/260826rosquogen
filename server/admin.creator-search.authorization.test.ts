import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function userContext(): TrpcContext {
  return {
    user: { id: 11, openId: "sales-user", name: "Sales User", email: "sales@example.com", loginMethod: "test", role: "user", isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("quotation creator search authorization", () => {
  it("does not expose user-account options to a sales user", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.admin.userOptions()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
