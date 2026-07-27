import { describe, expect, it } from "vitest";

import { registerSchema } from "@/features/auth/schemas/register.schema";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      name: "Jompo",
      email: "jompo@example.com",
      password: "at-least-8-chars",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = registerSchema.safeParse({
      name: "Jompo",
      email: "not-an-email",
      password: "at-least-8-chars",
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

  it("rejects an empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "jompo@example.com",
      password: "at-least-8-chars",
    });
    expect(result.success).toBe(false);
  });
});
