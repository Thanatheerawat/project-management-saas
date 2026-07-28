import { describe, expect, it } from "vitest";

import { addWorkspaceMemberSchema } from "@/features/workspace/schemas/add-member.schema";
import { updateWorkspaceMemberRoleSchema } from "@/features/workspace/schemas/update-member-role.schema";

describe("addWorkspaceMemberSchema", () => {
  it("accepts a bare email and defaults role to MEMBER", () => {
    const result = addWorkspaceMemberSchema.safeParse({ email: "a@example.com" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe("MEMBER");
  });

  it("accepts an explicit ADMIN role", () => {
    const result = addWorkspaceMemberSchema.safeParse({
      email: "a@example.com",
      role: "ADMIN",
    });
    expect(result.success).toBe(true);
  });

  // The security property this review is checking: role escalation to
  // OWNER must be impossible through this endpoint's payload shape alone,
  // independent of whatever caller-permission check Increment 3 adds.
  it("rejects OWNER as a role — ownership only ever moves via a dedicated transfer action", () => {
    const result = addWorkspaceMemberSchema.safeParse({
      email: "a@example.com",
      role: "OWNER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = addWorkspaceMemberSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("updateWorkspaceMemberRoleSchema", () => {
  it("accepts MEMBER and ADMIN", () => {
    expect(updateWorkspaceMemberRoleSchema.safeParse({ role: "MEMBER" }).success).toBe(
      true,
    );
    expect(updateWorkspaceMemberRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(
      true,
    );
  });

  it("rejects OWNER as a role", () => {
    const result = updateWorkspaceMemberRoleSchema.safeParse({ role: "OWNER" });
    expect(result.success).toBe(false);
  });
});
