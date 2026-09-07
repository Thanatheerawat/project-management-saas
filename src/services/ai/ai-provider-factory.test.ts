import { describe, expect, it } from "vitest";

import { createAIProvider } from "@/services/ai/ai-provider-factory";
import { GroqAIProvider } from "@/services/ai/groq-ai-provider";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";

describe("createAIProvider", () => {
  it("returns a MockAIProvider instance when type is 'mock'", () => {
    const provider = createAIProvider("mock");
    expect(provider).toBeInstanceOf(MockAIProvider);
  });

  it("returns a GroqAIProvider instance when type is 'groq' and an API key is given", () => {
    const provider = createAIProvider("groq", { groqApiKey: "fake-test-key" });
    expect(provider).toBeInstanceOf(GroqAIProvider);
  });

  it("propagates GroqAIProvider's own error when no API key is given for 'groq'", () => {
    expect(() => createAIProvider("groq", {})).toThrow(/non-empty API key/i);
  });

  it("propagates GroqAIProvider's own error when the API key is an empty string", () => {
    expect(() => createAIProvider("groq", { groqApiKey: "" })).toThrow(
      /non-empty API key/i,
    );
  });
});
