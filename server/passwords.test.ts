import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./_core/passwords";

describe("secure credential verification", () => {
  it("verifies the exact password without retaining it as readable text", async () => {
    const password = "RoshniSolar#2026";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("RoshniSolar#2027", hash)).resolves.toBe(false);
  });
});
