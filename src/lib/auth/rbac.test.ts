import { describe, expect, it } from "vitest";

import { ForbiddenError, hasRole, requireRole } from "@/lib/auth/rbac";

describe("hasRole", () => {
  it("allows a role to satisfy its own minimum", () => {
    expect(hasRole("USER", "USER")).toBe(true);
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("SUPER_ADMIN", "SUPER_ADMIN")).toBe(true);
  });

  it("allows a higher role to satisfy a lower minimum", () => {
    expect(hasRole("ADMIN", "USER")).toBe(true);
    expect(hasRole("SUPER_ADMIN", "USER")).toBe(true);
    expect(hasRole("SUPER_ADMIN", "ADMIN")).toBe(true);
  });

  it("rejects a lower role against a higher minimum", () => {
    expect(hasRole("USER", "ADMIN")).toBe(false);
    expect(hasRole("USER", "SUPER_ADMIN")).toBe(false);
    expect(hasRole("ADMIN", "SUPER_ADMIN")).toBe(false);
  });
});

describe("requireRole", () => {
  it("does not throw when the role satisfies the minimum", () => {
    expect(() => requireRole("ADMIN", "USER")).not.toThrow();
  });

  it("throws ForbiddenError when the role is insufficient", () => {
    expect(() => requireRole("USER", "ADMIN")).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when there is no role at all", () => {
    expect(() => requireRole(undefined, "USER")).toThrow(ForbiddenError);
    expect(() => requireRole(null, "USER")).toThrow(ForbiddenError);
  });
});
