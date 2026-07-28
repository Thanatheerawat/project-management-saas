import { describe, expect, it } from "vitest";

import { createWorkspaceSchema } from "@/features/workspace/schemas/create-workspace.schema";

describe("createWorkspaceSchema", () => {
  it("accepts a name with no slug or description", () => {
    const result = createWorkspaceSchema.safeParse({ name: "Acme Inc" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid slug", () => {
    const result = createWorkspaceSchema.safeParse({
      name: "Acme Inc",
      slug: "acme-inc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createWorkspaceSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it.each([
    "Acme-Inc", // uppercase not allowed
    "acme inc", // spaces not allowed
    "acme--inc", // double hyphen not allowed
    "-acme-inc", // leading hyphen not allowed
    "acme-inc-", // trailing hyphen not allowed
    "ac", // too short
    "a".repeat(51), // too long
  ])("rejects an invalid slug: %s", (slug) => {
    const result = createWorkspaceSchema.safeParse({ name: "Acme Inc", slug });
    expect(result.success).toBe(false);
  });
});
