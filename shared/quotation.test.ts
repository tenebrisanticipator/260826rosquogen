import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, calculatePlantSizeKw, formatIndianCurrency, normalizeIndianPhone, quotationNumberFor } from "./quotation";

describe("quotation business rules", () => {
  it("calculates the required plant size with two-decimal precision", () => {
    expect(calculatePlantSizeKw(540, 8)).toBe(4.32);
    expect(calculatePlantSizeKw(0, 8)).toBe(0);
  });

  it("formats quotation numbers in the strict required format", () => {
    expect(quotationNumberFor(2026, 1)).toBe("RS-2026-00001");
    expect(quotationNumberFor(2026, 128)).toBe("RS-2026-00128");
  });

  it("formats Indian currency using rupee and lakh grouping", () => {
    expect(formatIndianCurrency(226000)).toBe("₹2,26,000");
  });

  it("normalizes supported Indian mobile representations before opening WhatsApp", () => {
    expect(normalizeIndianPhone("98765 43210")).toBe("919876543210");
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("919876543210");
    expect(buildWhatsAppUrl("09876543210", "Hello")?.startsWith("https://wa.me/919876543210?text=Hello")).toBe(true);
    expect(normalizeIndianPhone("1234")).toBeNull();
  });
});
