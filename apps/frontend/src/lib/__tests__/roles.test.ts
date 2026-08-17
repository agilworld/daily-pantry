import { describe, it, expect, vi, beforeEach } from "vitest";
import { roleLabel } from "../roles";

describe("roleLabel", () => {
  it("maps known roles to friendly labels", () => {
    expect(roleLabel("employee")).toBe("Employee");
    expect(roleLabel("seller")).toBe("Seller");
    expect(roleLabel("office_boy")).toBe("Office Boy");
    expect(roleLabel("manager")).toBe("Manager");
  });

  it("falls back to spaced name for unknown roles", () => {
    expect(roleLabel("super_admin")).toBe("super admin");
  });

  it("handles null/undefined/empty", () => {
    expect(roleLabel(null)).toBe("");
    expect(roleLabel(undefined)).toBe("");
    expect(roleLabel("")).toBe("");
  });
});
