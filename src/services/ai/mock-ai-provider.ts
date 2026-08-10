import type { AIBreakdownOutput } from "@/features/ai/schemas/ai-breakdown-output.schema";
import { aiBreakdownOutputSchema } from "@/features/ai/schemas/ai-breakdown-output.schema";
import type { AIProvider } from "@/services/ai/ai-provider";

const SUMMARY_MAX_LENGTH = 60;

function summarize(prompt: string): string {
  const trimmed = prompt.trim();
  return trimmed.length > SUMMARY_MAX_LENGTH
    ? `${trimmed.slice(0, SUMMARY_MAX_LENGTH - 3)}...`
    : trimmed;
}

// Deterministic, offline stand-in for a real AI provider — the same prompt
// always produces the same 3 tasks, no network call, no API key required.
// Used for local development, tests, and demoing the feature with
// AI_PROVIDER=mock. Its own output is still parsed through the same Zod
// schema every real provider must satisfy, so this class also acts as a
// live proof the contract is satisfiable, not just documentation of it.
// Prompt-length/emptiness validation is the calling Route Handler's job
// (Increment 2), not this provider's — every provider should be able to
// assume it only ever receives an already-validated, non-empty prompt.
export class MockAIProvider implements AIProvider {
  async generateBreakdown(prompt: string): Promise<AIBreakdownOutput> {
    const trimmed = prompt.trim();
    const summary = summarize(prompt);

    return aiBreakdownOutputSchema.parse({
      tasks: [
        {
          title: `Design: ${summary}`,
          description: `Plan the approach for: ${trimmed}`,
          priority: "HIGH",
        },
        {
          title: `Implement: ${summary}`,
          description: `Build the core implementation for: ${trimmed}`,
          priority: "MEDIUM",
        },
        {
          title: `Test: ${summary}`,
          description: `Add test coverage for: ${trimmed}`,
          priority: "MEDIUM",
        },
      ],
    });
  }
}
