import { describe, expect, it } from "vitest";

import { createLabelSchema } from "@/features/issue/schemas/create-label.schema";

describe("createLabelSchema", () => {
  it("accepts a valid 6-digit hex color", () => {
    const result = createLabelSchema.safeParse({ name: "Bug", color: "#B2551E" });
    expect(result.success).toBe(true);
  });

  it("accepts lowercase hex digits", () => {
    const result = createLabelSchema.safeParse({ name: "Bug", color: "#b2551e" });
    expect(result.success).toBe(true);
  });

  it("rejects a 3-digit shorthand hex", () => {
    const result = createLabelSchema.safeParse({ name: "Bug", color: "#B25" });
    expect(result.success).toBe(false);
  });

  it("rejects a color missing the leading #", () => {
    const result = createLabelSchema.safeParse({ name: "Bug", color: "B2551E" });
    expect(result.success).toBe(false);
  });

  it("rejects a named color", () => {
    const result = createLabelSchema.safeParse({ name: "Bug", color: "red" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = createLabelSchema.safeParse({ name: "", color: "#B2551E" });
    expect(result.success).toBe(false);
  });
});
