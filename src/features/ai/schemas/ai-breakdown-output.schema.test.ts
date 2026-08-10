import { describe, expect, it } from "vitest";

import {
  aiBreakdownOutputSchema,
  draftTaskSchema,
  MAX_TASKS_PER_BREAKDOWN,
} from "@/features/ai/schemas/ai-breakdown-output.schema";

describe("draftTaskSchema", () => {
  it("accepts a valid task with all fields", () => {
    const result = draftTaskSchema.safeParse({
      title: "Design the login page",
      description: "Wireframe and review with the team",
      priority: "HIGH",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid task with only the required title", () => {
    const result = draftTaskSchema.safeParse({ title: "Write tests" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = draftTaskSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 200 characters", () => {
    const result = draftTaskSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects a description longer than 5000 characters", () => {
    const result = draftTaskSchema.safeParse({
      title: "Valid title",
      description: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    const result = draftTaskSchema.safeParse({
      title: "Valid title",
      priority: "CRITICAL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unexpected extra field (strict mode)", () => {
    const result = draftTaskSchema.safeParse({
      title: "Valid title",
      status: "DONE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = draftTaskSchema.safeParse({ description: "No title here" });
    expect(result.success).toBe(false);
  });
});

describe("aiBreakdownOutputSchema", () => {
  it("accepts a single valid task", () => {
    const result = aiBreakdownOutputSchema.safeParse({
      tasks: [{ title: "One task" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts exactly the maximum number of tasks", () => {
    const tasks = Array.from({ length: MAX_TASKS_PER_BREAKDOWN }, (_, i) => ({
      title: `Task ${i + 1}`,
    }));
    const result = aiBreakdownOutputSchema.safeParse({ tasks });
    expect(result.success).toBe(true);
  });

  it("rejects an empty task list", () => {
    const result = aiBreakdownOutputSchema.safeParse({ tasks: [] });
    expect(result.success).toBe(false);
  });

  it("rejects more tasks than the maximum allowed", () => {
    const tasks = Array.from({ length: MAX_TASKS_PER_BREAKDOWN + 1 }, (_, i) => ({
      title: `Task ${i + 1}`,
    }));
    const result = aiBreakdownOutputSchema.safeParse({ tasks });
    expect(result.success).toBe(false);
  });

  it("rejects malformed JSON shapes (missing tasks key)", () => {
    const result = aiBreakdownOutputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a tasks value that isn't an array", () => {
    const result = aiBreakdownOutputSchema.safeParse({ tasks: "not an array" });
    expect(result.success).toBe(false);
  });

  it("rejects an unexpected extra top-level field (strict mode)", () => {
    const result = aiBreakdownOutputSchema.safeParse({
      tasks: [{ title: "One task" }],
      extra: "unexpected",
    });
    expect(result.success).toBe(false);
  });

  it("rejects if any single task in the list is invalid", () => {
    const result = aiBreakdownOutputSchema.safeParse({
      tasks: [{ title: "Valid task" }, { title: "" }],
    });
    expect(result.success).toBe(false);
  });
});
