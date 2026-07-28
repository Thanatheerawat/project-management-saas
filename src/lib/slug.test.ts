import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates a normal name", () => {
    expect(slugify("Acme Inc")).toBe("acme-inc");
  });

  it("collapses runs of non-alphanumeric characters into a single hyphen", () => {
    expect(slugify("Acme   & Co.!!")).toBe("acme-co");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  --Acme--  ")).toBe("acme");
  });

  it("truncates to 50 characters", () => {
    const result = slugify("a".repeat(100));
    expect(result.length).toBe(50);
  });

  it("falls back to a random suffix when there's nothing sluggable", () => {
    const result = slugify("!!!");
    expect(result).toMatch(/^[a-f0-9]{8}$/);
  });

  it("appends a random suffix when the sluggable part is too short", () => {
    const result = slugify("A!");
    expect(result).toMatch(/^a-[a-f0-9]{8}$/);
  });
});
