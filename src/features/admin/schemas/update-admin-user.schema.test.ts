import { describe, expect, it } from "vitest";

import { updateAdminUserSchema } from "@/features/admin/schemas/update-admin-user.schema";

describe("updateAdminUserSchema", () => {
  it("accepts isActive alone", () => {
    const result = updateAdminUserSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isActive).toBe(false);
  });

  it("accepts role alone", () => {
    const result = updateAdminUserSchema.safeParse({ role: "ADMIN" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe("ADMIN");
  });

  it("accepts both fields together", () => {
    const result = updateAdminUserSchema.safeParse({
      isActive: true,
      role: "SUPER_ADMIN",
    });
    expect(result.success).toBe(true);
  });

  // The route handler relies on this: an empty PATCH body is a validation
  // error, not a silent no-op (features/admin/schemas/update-admin-user.schema.ts).
  it("rejects an empty object — at least one field is required", () => {
    const result = updateAdminUserSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a role value that isn't a real PlatformRole", () => {
    const result = updateAdminUserSchema.safeParse({ role: "OWNER" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-boolean isActive", () => {
    const result = updateAdminUserSchema.safeParse({ isActive: "yes" });
    expect(result.success).toBe(false);
  });

  it("accepts every PlatformRole value", () => {
    for (const role of ["USER", "ADMIN", "SUPER_ADMIN"]) {
      expect(updateAdminUserSchema.safeParse({ role }).success).toBe(true);
    }
  });
});
