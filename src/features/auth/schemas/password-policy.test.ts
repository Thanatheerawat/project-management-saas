import { describe, expect, it } from "vitest";

import {
  getPasswordRequirementStatus,
  passwordPolicySchema,
} from "@/features/auth/schemas/password-policy";

describe("getPasswordRequirementStatus", () => {
  it("reports every requirement as unmet for an empty password", () => {
    expect(getPasswordRequirementStatus("")).toEqual({
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
    });
  });

  it("reports every requirement as met for a fully compliant password", () => {
    expect(getPasswordRequirementStatus("Password123")).toEqual({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasNumber: true,
    });
  });

  it("reports minLength as false below 8 characters, true at exactly 8", () => {
    expect(getPasswordRequirementStatus("Ab1").minLength).toBe(false);
    expect(getPasswordRequirementStatus("Abcdefg1").minLength).toBe(true);
  });

  it("evaluates each requirement independently", () => {
    expect(getPasswordRequirementStatus("alllowercase1")).toEqual({
      minLength: true,
      hasUppercase: false,
      hasLowercase: true,
      hasNumber: true,
    });
    expect(getPasswordRequirementStatus("ALLUPPERCASE1")).toEqual({
      minLength: true,
      hasUppercase: true,
      hasLowercase: false,
      hasNumber: true,
    });
    expect(getPasswordRequirementStatus("NoNumbersHere")).toEqual({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasNumber: false,
    });
  });
});

describe("passwordPolicySchema", () => {
  it("accepts a password meeting all four requirements", () => {
    expect(passwordPolicySchema.safeParse("Password123").success).toBe(true);
  });

  it("rejects a password shorter than 8 characters, with the length message first", () => {
    const result = passwordPolicySchema.safeParse("Ab1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("validation.passwordMin8");
    }
  });

  it("rejects a password with no uppercase letter", () => {
    const result = passwordPolicySchema.safeParse("alllowercase1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        "validation.passwordUppercase",
      );
    }
  });

  it("rejects a password with no lowercase letter", () => {
    const result = passwordPolicySchema.safeParse("ALLUPPERCASE1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        "validation.passwordLowercase",
      );
    }
  });

  it("rejects a password with no number", () => {
    const result = passwordPolicySchema.safeParse("NoNumbersHere");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        "validation.passwordNumber",
      );
    }
  });
});
