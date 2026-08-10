import { describe, expect, it } from "vitest";

import { aiBreakdownOutputSchema } from "@/features/ai/schemas/ai-breakdown-output.schema";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";

describe("MockAIProvider", () => {
  it("returns output that satisfies aiBreakdownOutputSchema", async () => {
    const provider = new MockAIProvider();
    const result = await provider.generateBreakdown("Build a login page");
    expect(aiBreakdownOutputSchema.safeParse(result).success).toBe(true);
  });

  it("returns at least one task", async () => {
    const provider = new MockAIProvider();
    const result = await provider.generateBreakdown("Build a login page");
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  it("is deterministic — the same prompt produces the same output every time", async () => {
    const provider = new MockAIProvider();
    const first = await provider.generateBreakdown("Refactor the billing module");
    const second = await provider.generateBreakdown("Refactor the billing module");
    expect(first).toEqual(second);
  });

  it("produces different output for a different prompt", async () => {
    const provider = new MockAIProvider();
    const first = await provider.generateBreakdown("Build a login page");
    const second = await provider.generateBreakdown("Migrate the database");
    expect(first).not.toEqual(second);
  });

  it("references the prompt text in the generated tasks", async () => {
    const provider = new MockAIProvider();
    const result = await provider.generateBreakdown("Add dark mode support");
    const allText = result.tasks
      .map((t) => `${t.title} ${t.description ?? ""}`)
      .join(" ");
    expect(allText).toContain("Add dark mode support");
  });

  it("handles a whitespace-only prompt without throwing", async () => {
    const provider = new MockAIProvider();
    const result = await provider.generateBreakdown("   ");
    expect(aiBreakdownOutputSchema.safeParse(result).success).toBe(true);
  });

  it("handles a very long prompt without exceeding title length limits", async () => {
    const provider = new MockAIProvider();
    const longPrompt = "a".repeat(1000);
    const result = await provider.generateBreakdown(longPrompt);
    expect(aiBreakdownOutputSchema.safeParse(result).success).toBe(true);
    for (const task of result.tasks) {
      expect(task.title.length).toBeLessThanOrEqual(200);
    }
  });

  it("only assigns priorities from the allowed set", async () => {
    const provider = new MockAIProvider();
    const result = await provider.generateBreakdown("Ship the release");
    for (const task of result.tasks) {
      if (task.priority !== undefined) {
        expect(["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"]).toContain(task.priority);
      }
    }
  });
});
