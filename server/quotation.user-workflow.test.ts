import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const getDb = vi.fn();
const getNextQuotationNumber = vi.fn();
const writeActivityLog = vi.fn();
vi.mock("./db", () => ({ getDb, getNextQuotationNumber, writeActivityLog }));

const { quotationRouter } = await import("./routers/quotations");

function userContext(): TrpcContext {
  return { user: { id: 21, openId: "sales-user", name: "Sales User", email: "sales@example.com", loginMethod: "test", role: "user", isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

const proposal = { customerName: "Scoped Customer", customerAddress: "Vadodara", customerPhone: "9876543210", panelName: "Waaree", panelType: "Bifacial", panelWatt: 540, numberOfPanels: 8, inverterCompany: "Solitus", plantCost: 220000 };

describe("normal-user quotation workflow", () => {
  beforeEach(() => { getDb.mockReset(); getNextQuotationNumber.mockReset(); writeActivityLog.mockReset(); getNextQuotationNumber.mockResolvedValue("RS-2026-00042"); writeActivityLog.mockResolvedValue(undefined); });

  it("stores a new quotation under the signed-in normal user", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 99 }]);
    const values = vi.fn(() => ({ returning }));
    getDb.mockResolvedValue({ insert: vi.fn(() => ({ values })) });
    const result = await quotationRouter.createCaller(userContext()).create(proposal);
    expect(result).toEqual({ id: 99, quotationNumber: "RS-2026-00042" });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 21, customerName: "Scoped Customer", quotationNumber: "RS-2026-00042" }));
  });

  it("treats a quotation outside the normal user scope as unavailable", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    getDb.mockResolvedValue({ select: vi.fn(() => ({ from: () => ({ leftJoin: () => ({ where: () => ({ limit }) }) }) })) });
    await expect(quotationRouter.createCaller(userContext()).getById({ id: 777 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(limit).toHaveBeenCalledWith(1);
  });
});
