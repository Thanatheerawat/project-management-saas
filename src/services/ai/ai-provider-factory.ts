import type { AIProviderType } from "@/features/ai/types";
import type { AIProvider } from "@/services/ai/ai-provider";
import { GroqAIProvider } from "@/services/ai/groq-ai-provider";
import { MockAIProvider } from "@/services/ai/mock-ai-provider";

// Provider-specific config the factory threads through without ever
// reading it itself — same reasoning as `type` below: keeps this file
// free of any env.ts dependency (see the function comment).
export interface AIProviderConfig {
  groqApiKey?: string;
}

// Single swap point for which AIProvider implementation is active. Takes
// an explicit type (and, for Groq, an explicit API key) rather than
// reading env.AI_PROVIDER/env.GROQ_API_KEY itself — this keeps the
// factory free of any dependency on env parsing (and therefore trivially
// unit-testable with zero setup, and safe to import from a plain unit
// test that has no DATABASE_URL/NEXTAUTH_SECRET). The M7 Increment 2/3
// Route Handler is the one that resolves env.AI_PROVIDER/env.GROQ_API_KEY
// and passes them in. Missing/empty groqApiKey is not validated here —
// GroqAIProvider's own constructor rejects it, so there's exactly one
// place that check lives.
export function createAIProvider(
  type: AIProviderType,
  config: AIProviderConfig = {},
): AIProvider {
  if (type === "mock") {
    return new MockAIProvider();
  }

  if (type === "groq") {
    return new GroqAIProvider(config.groqApiKey ?? "");
  }

  const exhaustiveCheck: never = type;
  throw new Error(`Unknown AI provider: ${exhaustiveCheck}`);
}
