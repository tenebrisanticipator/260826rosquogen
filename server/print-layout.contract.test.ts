import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("A4 quotation print contract", () => {
  const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

  it("defines physical A4 dimensions, avoids row splitting, and uses enlarged readable print type", () => {
    expect(css).toContain("@page { size: A4; margin: 0; }");
    expect(css).toContain("width: 210mm !important; height: 297mm !important");
    expect(css).toContain(".quote-table tr { break-inside: avoid; page-break-inside: avoid; }");
    expect(css).toContain("font-size: 11pt !important");
    expect(css).toContain("font-size: 22pt !important");
  });
});
