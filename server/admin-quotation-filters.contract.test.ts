import { describe, expect, it } from "vitest";
import { buildAdminQuotationListInput } from "../client/src/lib/adminQuotationFilters";

describe("administrator quotation worklist filters", () => {
  it("maps search, status, creator, plant size, date range, and sort values into the quotation-list query", () => {
    const input = buildAdminQuotationListInput({ query: "Asha", status: "generated", creatorId: "14", plantSize: "4.32", dateRange: "30", sort: "highest_cost" }, new Date("2026-08-24T15:00:00.000Z"));

    expect(input).toMatchObject({ query: "Asha", status: "generated", userId: 14, plantSize: "4.32", sort: "highest_cost", page: 1, pageSize: 6 });
    const expectedDate = new Date("2026-08-24T15:00:00.000Z");
    expectedDate.setDate(expectedDate.getDate() - 30);
    expectedDate.setHours(0, 0, 0, 0);
    expect(input.dateFrom).toEqual(expectedDate);
  });

  it("omits inactive filters while preserving the requested sort order", () => {
    const input = buildAdminQuotationListInput({ query: "", status: "all", creatorId: "", plantSize: "", dateRange: "all", sort: "customer_name" });

    expect(input).toMatchObject({ query: undefined, status: undefined, userId: undefined, plantSize: undefined, dateFrom: undefined, sort: "customer_name" });
  });
});
