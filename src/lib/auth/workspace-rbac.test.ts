import { describe, expect, it } from "vitest";

import { ForbiddenError } from "@/lib/auth/rbac";
import { hasWorkspaceRole, requireWorkspaceRole } from "@/lib/auth/workspace-rbac";

describe("hasWorkspaceRole", () => {
  it("allows a role to satisfy its own minimum", () => {
    expect(hasWorkspaceRole("MEMBER", "MEMBER")).toBe(true);
    expect(hasWorkspaceRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasWorkspaceRole("OWNER", "OWNER")).toBe(true);
  });

  it("allows a higher role to satisfy a lower minimum", () => {
    expect(hasWorkspaceRole("ADMIN", "MEMBER")).toBe(true);
    expect(hasWorkspaceRole("OWNER", "MEMBER")).toBe(true);
    expect(hasWorkspaceRole("OWNER", "ADMIN")).toBe(true);
  });

  it("rejects a lower role against a higher minimum", () => {
    expect(hasWorkspaceRole("MEMBER", "ADMIN")).toBe(false);
    expect(hasWorkspaceRole("MEMBER", "OWNER")).toBe(false);
    expect(hasWorkspaceRole("ADMIN", "OWNER")).toBe(false);
  });
});

describe("requireWorkspaceRole", () => {
  it("does not throw when the role satisfies the minimum", () => {
    expect(() => requireWorkspaceRole("ADMIN", "MEMBER")).not.toThrow();
  });

  it("throws ForbiddenError when the role is insufficient", () => {
    expect(() => requireWorkspaceRole("MEMBER", "ADMIN")).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when there is no role at all (not a member)", () => {
    expect(() => requireWorkspaceRole(undefined, "MEMBER")).toThrow(ForbiddenError);
    expect(() => requireWorkspaceRole(null, "MEMBER")).toThrow(ForbiddenError);
  });
});
