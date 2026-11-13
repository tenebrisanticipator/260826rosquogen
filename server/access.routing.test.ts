import { describe, expect, it } from "vitest";
import { canAccessAdministration, homePathForRole } from "../shared/access";

describe("role-specific application routes", () => {
  it("routes sales users to their quotation home and excludes administration", () => {
    expect(homePathForRole("user")).toBe("/home");
    expect(canAccessAdministration("user")).toBe(false);
  });

  it("routes administrators to the distinct administrator dashboard", () => {
    expect(homePathForRole("admin")).toBe("/admin/dashboard");
    expect(canAccessAdministration("admin")).toBe(true);
  });
});
