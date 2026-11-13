import { describe, expect, it } from "vitest";
import { scopeForUser } from "./routers/quotations";

describe("quotation ownership scope", () => {
  it("adds an ownership scope for a normal sales user", () => {
    expect(scopeForUser({ id: 14, role: "user" })).toBeDefined();
  });

  it("does not apply a creator filter for an administrator", () => {
    expect(scopeForUser({ id: 1, role: "admin" })).toBeUndefined();
  });
});
