import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const getDb = vi.fn();
const writeActivityLog = vi.fn();
vi.mock("./db", () => ({ getDb, writeActivityLog }));

const { appRouter } = await import("./routers");

function adminContext(): TrpcContext {
  return { user: { id: 1, openId: "admin", name: "Admin", email: "admin@example.com", loginMethod: "test", role: "admin", isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("administrator user actions", () => {
  beforeEach(() => { getDb.mockReset(); writeActivityLog.mockReset(); writeActivityLog.mockResolvedValue(undefined); });

  it("creates a pending user with an administrator-assigned role", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 42 }]);
    const values = vi.fn(() => ({ returning }));
    const db = { select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) })), insert: vi.fn(() => ({ values })) };
    getDb.mockResolvedValue(db);
    const result = await appRouter.createCaller(adminContext()).admin.createUser({ name: "Sales User", email: "Sales@Example.com", password: "SecurePass123", role: "user" });
    expect(result).toEqual({ id: 42 });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ name: "Sales User", email: "sales@example.com", role: "user", openId: expect.stringMatching(/^password:/), passwordHash: expect.stringMatching(/^scrypt\$/) }));
    expect(writeActivityLog).toHaveBeenCalledWith(expect.objectContaining({ action: "user.created" }));
  });

  it("updates and deletes a managed user", async () => {
    const where = vi.fn().mockResolvedValue(undefined); const set = vi.fn(() => ({ where }));
    const db = { update: vi.fn(() => ({ set })), delete: vi.fn(() => ({ where })) };
    getDb.mockResolvedValue(db);
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.admin.updateUser({ id: 2, name: "Updated User", email: "updated@example.com", role: "user", isActive: true })).resolves.toEqual({ success: true });
    await expect(caller.admin.deleteUser({ id: 2 })).resolves.toEqual({ success: true });
    expect(writeActivityLog).toHaveBeenCalledWith(expect.objectContaining({ action: "user.updated" }));
    expect(writeActivityLog).toHaveBeenCalledWith(expect.objectContaining({ action: "user.deleted" }));
  });
});
