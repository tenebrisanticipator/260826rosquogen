import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, calculatePlantSizeKw, formatIndianCurrency, normalizeIndianPhone, quotationNumberFor } from "../shared/quotation";

describe("quotation business rules", () => {
  it("calculates the fixed plant-size formula with two-decimal precision", () => {
    expect(calculatePlantSizeKw(540, 8)).toBe(4.32);
    expect(calculatePlantSizeKw(0, 8)).toBe(0);
  });

  it("creates quotation numbers in strict RS-YYYY-NNNNN format", () => {
    expect(quotationNumberFor(2026, 1)).toBe("RS-2026-00001");
    expect(quotationNumberFor(2026, 128)).toBe("RS-2026-00128");
  });

  it("uses Indian rupee grouping and valid WhatsApp phone normalization", () => {
    expect(formatIndianCurrency(226000)).toBe("₹2,26,000");
    expect(normalizeIndianPhone("98765 43210")).toBe("919876543210");
    expect(buildWhatsAppUrl("09876543210", "Hello")?.startsWith("https://wa.me/919876543210?text=Hello")).toBe(true);
    expect(normalizeIndianPhone("1234")).toBeNull();
  });
});
