import { describe, expect, it, vi } from "vitest";
import { completeQuotationPdfExport, quotationPdfFilename } from "../client/src/lib/exportQuotationPdf";

describe("quotation PDF export", () => {
  it("creates a safe descriptive filename for a client-downloadable quotation PDF", () => {
    expect(quotationPdfFilename("RS-2026-00001", "Asha & Sons / Vadodara")).toBe("rs-2026-00001-asha-sons-vadodara.pdf");
  });

  it("falls back to a stable name when a source value has no usable filename characters", () => {
    expect(quotationPdfFilename("***", "???")).toBe("roshni-solar-quotation-roshni-solar-quotation.pdf");
  });

  it("creates the file and records the generation event only for a newly generated quotation", async () => {
    const createPdf = vi.fn().mockResolvedValue(undefined);
    const markGenerated = vi.fn().mockResolvedValue(undefined);
    const root = {} as HTMLElement;

    await completeQuotationPdfExport({ root, quotationNumber: "RS-2026-00001", customerName: "Asha", wasPreviouslyGenerated: false, createPdf, markGenerated });

    expect(createPdf).toHaveBeenCalledWith(root, "RS-2026-00001", "Asha");
    expect(markGenerated).toHaveBeenCalledTimes(1);
  });

  it("does not rewrite the generation status when exporting an already prepared quotation", async () => {
    const createPdf = vi.fn().mockResolvedValue(undefined);
    const markGenerated = vi.fn().mockResolvedValue(undefined);

    await completeQuotationPdfExport({ root: {} as HTMLElement, quotationNumber: "RS-2026-00001", customerName: "Asha", wasPreviouslyGenerated: true, createPdf, markGenerated });

    expect(markGenerated).not.toHaveBeenCalled();
  });
});
