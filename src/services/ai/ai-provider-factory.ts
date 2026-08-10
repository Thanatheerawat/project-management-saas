import type { AIProviderType } from "@/features/ai/types";
import type { AIProvider } from "@/services/ai/ai-provider";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";

// Single swap point for which AIProvider implementation is active. Takes
// an explicit type rather than reading env.AI_PROVIDER itself — this
// keeps the factory free of any dependency on env parsing (and therefore
// trivially unit-testable with zero setup). The M7 Increment 2 Route
// Handler is the one that resolves env.AI_PROVIDER and passes it in.
export function createAIProvider(type: AIProviderType): AIProvider {
  if (type === "mock") {
    return new MockAIProvider();
  }

  if (type === "groq") {
    // Implemented in M7 Increment 3 — see docs/session-log.md.
    throw new Error(
      "GroqAIProvider is not implemented yet (planned for M7 Increment 3).",
    );
  }

  const exhaustiveCheck: never = type;
  throw new Error(`Unknown AI provider: ${exhaustiveCheck}`);
}
