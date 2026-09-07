import { z } from "zod";

import type { AIBreakdownOutput } from "@/features/ai/schemas/ai-breakdown-output.schema";
import {
  aiBreakdownOutputSchema,
  MAX_TASKS_PER_BREAKDOWN,
} from "@/features/ai/schemas/ai-breakdown-output.schema";
import { ISSUE_PRIORITIES } from "@/features/issue/schemas/create-issue.schema";
import type { AIProvider } from "@/services/ai/ai-provider";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Verified against Groq's official docs (console.groq.com/docs/models,
// console.groq.com/docs/structured-outputs) at implementation time
// (2026-09) — a currently-active production model that supports the
// json_schema structured-output response format. Named constant so a
// future model deprecation/upgrade is a one-line change, not a
// find-and-replace across this file.
export const GROQ_MODEL = "openai/gpt-oss-20b";

// M7 Increment 3 decision: 30s, non-negotiable per approval — no retry
// logic in this increment. A timeout here becomes an ordinary thrown
// error, handled identically to any other provider failure by the Route
// Handler's existing catch block (see ai/breakdown/route.ts).
const REQUEST_TIMEOUT_MS = 30_000;

const RESPONSE_SCHEMA_NAME = "ai_breakdown_output";

// Derived directly from aiBreakdownOutputSchema via Zod's own
// z.toJSONSchema — never hand-duplicated, so the shape sent to Groq and
// the shape this provider actually validates against can never drift
// apart. `$schema` is stripped: it's JSON Schema meta-info about the
// schema document itself, not part of the data shape, and some
// structured-output implementations reject unrecognized top-level keys.
const RESPONSE_JSON_SCHEMA = (() => {
  const schema: Record<string, unknown> = { ...z.toJSONSchema(aiBreakdownOutputSchema) };
  delete schema.$schema;
  return schema;
})();

// Fixed system instruction — never includes workspace/user data, only the
// output contract itself. ISSUE_PRIORITIES/MAX_TASKS_PER_BREAKDOWN are
// interpolated from the same constants aiBreakdownOutputSchema enforces,
// so the prompt can't silently drift out of sync with the actual schema.
const SYSTEM_PROMPT = `You are a project-planning assistant. Break the user's request into a list of discrete, actionable tasks.

Respond with a single JSON object only. Do not include any prose, explanation, or markdown code fences outside the JSON object.

The JSON object must have exactly this shape:
{"tasks": [{"title": string, "description": string (optional), "priority": string (optional)}]}

Rules:
- Generate at most ${MAX_TASKS_PER_BREAKDOWN} tasks.
- Do not include any key other than "tasks" at the top level.
- Do not include any field on a task other than "title", "description", and "priority".
- If included, "priority" must be exactly one of: ${ISSUE_PRIORITIES.join(", ")}.`;

interface GroqChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

// Real Groq Chat Completions integration behind the AIProvider interface
// (ai-provider.ts) — implements the exact same one method as
// MockAIProvider, so the factory and Route Handler never need to know
// which concrete provider is active. Receives the API key explicitly via
// the constructor rather than reading env.GROQ_API_KEY itself — the same
// reason ai-provider-factory.ts stays free of env.ts (see that file):
// this class must remain import-reachable from a plain unit test without
// ever pulling in env.ts's eager DATABASE_URL/NEXTAUTH_SECRET validation.
export class GroqAIProvider implements AIProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GroqAIProvider requires a non-empty API key");
    }
    this.apiKey = apiKey;
  }

  async generateBreakdown(prompt: string): Promise<AIBreakdownOutput> {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        // strict: false — the existing draftTaskSchema has optional
        // fields (description/priority), which OpenAI-style strict
        // structured-output mode doesn't support without restructuring
        // every optional field as nullable-and-required. Rather than
        // reshape the schema this provider must still validate against
        // unchanged, this uses Groq's best-effort json_schema mode: the
        // model is biased toward this exact shape, and
        // aiBreakdownOutputSchema.parse() below remains the real,
        // unconditional gate regardless of what Groq returns.
        response_format: {
          type: "json_schema",
          json_schema: {
            name: RESPONSE_SCHEMA_NAME,
            strict: false,
            schema: RESPONSE_JSON_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Status only, never the response body — a Groq error body could
      // contain provider-internal detail that shouldn't propagate any
      // further than this thrown message (which the route logs
      // server-side and stores on the job row, but never returns to the
      // client — see ai/breakdown/route.ts's provider-failure branch).
      throw new Error(`Groq request failed with status ${response.status}`);
    }

    const data = (await response.json()) as GroqChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("Groq response did not include assistant content");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Groq response content was not valid JSON");
    }

    // The real validation gate — identical to what MockAIProvider already
    // runs its own output through. A ZodError thrown here propagates like
    // any other error from this method; the caller (the route) does not
    // distinguish "invalid AI output" from any other provider failure.
    return aiBreakdownOutputSchema.parse(parsed);
  }
}
