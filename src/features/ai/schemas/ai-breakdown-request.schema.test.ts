import { describe, expect, it } from "vitest";

import {
  aiBreakdownRequestSchema,
  MAX_PROMPT_LENGTH,
} from "@/features/ai/schemas/ai-breakdown-request.schema";

describe("aiBreakdownRequestSchema", () => {
  it("accepts a normal prompt", () => {
    const result = aiBreakdownRequestSchema.safeParse({
      prompt: "Build a login page with email and password fields",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty prompt", () => {
    const result = aiBreakdownRequestSchema.safeParse({ prompt: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only prompt as empty", () => {
    const result = aiBreakdownRequestSchema.safeParse({ prompt: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a prompt longer than MAX_PROMPT_LENGTH", () => {
    const result = aiBreakdownRequestSchema.safeParse({
      prompt: "a".repeat(MAX_PROMPT_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a prompt exactly at MAX_PROMPT_LENGTH", () => {
    const result = aiBreakdownRequestSchema.safeParse({
      prompt: "a".repeat(MAX_PROMPT_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing prompt field", () => {
    const result = aiBreakdownRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
