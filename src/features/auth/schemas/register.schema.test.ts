import { describe, expect, it } from "vitest";

import { registerSchema } from "@/features/auth/schemas/register.schema";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      name: "Jompo",
      email: "jompo@example.com",
      password: "AtLeast8Chars",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = registerSchema.safeParse({
      name: "Jompo",
      email: "not-an-email",
      password: "AtLeast8Chars",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "Jompo",
      email: "jompo@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no uppercase letter", () => {
    const result = registerSchema.safeParse({
      name: "Jompo",
      email: "jompo@example.com",
      password: "alllowercase1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no lowercase letter", () => {
    const result = registerSchema.safeParse({
      name: "Jompo",
      email: "jompo@example.com",
      password: "ALLUPPERCASE1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no number", () => {
    const result = registerSchema.safeParse({
      name: "Jompo",
      email: "jompo@example.com",
      password: "NoNumbersHere",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "jompo@example.com",
      password: "AtLeast8Chars",
    });
    expect(result.success).toBe(false);
  });
});
