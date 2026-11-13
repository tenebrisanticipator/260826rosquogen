import { describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb,
  getNextQuotationNumber: vi.fn(),
  writeActivityLog: vi.fn(),
}));

import { appRouter } from "./routers";

describe("quotations.dashboard", () => {
  it("executes dashboard metrics queries successfully for administrator", async () => {
    const mockDb = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 4, total: "1082000.00" }])),
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })),
        })),
      })),
    };

    getDb.mockResolvedValue(mockDb);

    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: {
        id: 1,
        openId: "test-admin",
        name: "Admin User",
        email: "admin@example.com",
        passwordHash: "hash",
        loginMethod: "credentials",
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    const result = await caller.quotations.dashboard();
    expect(result).toBeDefined();
    expect(result.totals.quotations).toBe(4);
    expect(result.totals.customers).toBe(4);
    expect(result.totals.quotationValue).toBe("1082000.00");
    expect(result.totals.thisMonth).toBe(4);
    expect(result.recent).toEqual([]);
  });
});
