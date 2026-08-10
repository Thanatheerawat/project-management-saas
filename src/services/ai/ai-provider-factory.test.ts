import { describe, expect, it } from "vitest";

import { createAIProvider } from "@/services/ai/ai-provider-factory";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";

describe("createAIProvider", () => {
  it("returns a MockAIProvider instance when type is 'mock'", () => {
    const provider = createAIProvider("mock");
    expect(provider).toBeInstanceOf(MockAIProvider);
  });

  it("throws a clear not-yet-implemented error when type is 'groq'", () => {
    expect(() => createAIProvider("groq")).toThrow(/not implemented yet/i);
  });
});
