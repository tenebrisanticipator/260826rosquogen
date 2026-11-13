import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import QuotationDocument from "../client/src/components/QuotationDocument";

describe("printable quotation composition", () => {
  it("keeps the commercial proposal with the technical specification and renders all PDF-derived reference sheets", () => {
    const markup = renderToStaticMarkup(createElement(QuotationDocument, { quotation: { quotationNumber: "RS-2026-00001", customerName: "Reference Customer", customerAddress: "Vadodara", customerPhone: "9876543210", panelName: "Waaree", panelType: "Bifacial", panelTypeOther: null, panelWatt: 540, numberOfPanels: 8, plantSizeKw: "4.32", inverterCompany: "UTL", plantCost: "226000", quotationDate: new Date("2026-07-06") } }));
    expect(markup.indexOf("Solar photovoltaic grid tied system diagram")).toBeLessThan(markup.indexOf("Commercial Proposal:"));
    expect(markup.indexOf("Commercial Proposal:")).toBeLessThan(markup.indexOf("Payback Calculation:"));
    expect(markup).toMatch(/reference-4(?:_db99f349)?\.png/);
    expect(markup).toMatch(/reference-5(?:_48bb1a3a)?\.png/);
    expect(markup).toMatch(/reference-6(?:_387aedec)?\.png/);
    expect(markup).toContain("Page 6 of 6");
    expect(markup).toContain("Roshni Solar");
    expect(markup).toContain("Proposal scope");
  });
});
