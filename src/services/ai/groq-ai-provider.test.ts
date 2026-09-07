import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_TASKS_PER_BREAKDOWN } from "@/features/ai/schemas/ai-breakdown-output.schema";
import { GROQ_MODEL, GroqAIProvider } from "@/services/ai/groq-ai-provider";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function fakeGroqResponse(content: unknown, overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
    ...overrides,
  } as Response;
}

function validAssistantJson(taskCount = 1): string {
  return JSON.stringify({
    tasks: Array.from({ length: taskCount }, (_, i) => ({ title: `Task ${i + 1}` })),
  });
}

describe("GroqAIProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("throws when the API key is missing (undefined)", () => {
      expect(() => new GroqAIProvider(undefined as unknown as string)).toThrow(
        /non-empty API key/i,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws when the API key is an empty string", () => {
      expect(() => new GroqAIProvider("")).toThrow(/non-empty API key/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("never calls fetch as a side effect of construction with a valid key", () => {
      const provider = new GroqAIProvider("key");
      expect(provider).toBeInstanceOf(GroqAIProvider);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("generateBreakdown — request shape", () => {
    it("returns a valid AIBreakdownOutput for a successful response", async () => {
      fetchMock.mockResolvedValue(fakeGroqResponse(validAssistantJson(2)));
      const provider = new GroqAIProvider("key");

      const result = await provider.generateBreakdown("Build a login page");

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].title).toBe("Task 1");
    });

    it("calls fetch exactly once, with POST and the correct Groq endpoint", async () => {
      fetchMock.mockResolvedValue(fakeGroqResponse(validAssistantJson()));
      const provider = new GroqAIProvider("key");

      await provider.generateBreakdown("Build a login page");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(GROQ_API_URL);
      expect(init.method).toBe("POST");
    });

    it("constructs the Authorization header from the given API key", async () => {
      fetchMock.mockResolvedValue(fakeGroqResponse(validAssistantJson()));
      const provider = new GroqAIProvider("my-secret-key");

      await provider.generateBreakdown("x");

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.Authorization).toBe("Bearer my-secret-key");
    });

    it("sends Content-Type: application/json", async () => {
      fetchMock.mockResolvedValue(fakeGroqResponse(validAssistantJson()));
      const provider = new GroqAIProvider("key");

      await provider.generateBreakdown("x");

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers["Content-Type"]).toBe("application/json");
    });

    it("sends a non-streaming request using the configured model", async () => {
      fetchMock.mockResolvedValue(fakeGroqResponse(validAssistantJson()));
      const provider = new GroqAIProvider("key");

      await provider.generateBreakdown("x");

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.stream).toBe(false);
      expect(body.model).toBe(GROQ_MODEL);
    });

    it("passes an AbortSignal from AbortSignal.timeout(30_000)", async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
      fetchMock.mockResolvedValue(fakeGroqResponse(validAssistantJson()));
      const provider = new GroqAIProvider("key");

      await provider.generateBreakdown("x");

      expect(timeoutSpy).toHaveBeenCalledWith(30_000);
      const [, init] = fetchMock.mock.calls[0];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("sends only the fixed system instruction and the user's prompt — nothing else", async () => {
      fetchMock.mockResolvedValue(fakeGroqResponse(validAssistantJson()));
      const provider = new GroqAIProvider("key");

      await provider.generateBreakdown("Build a login page with SSO");

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe("system");
      expect(body.messages[1]).toEqual({
        role: "user",
        content: "Build a login page with SSO",
      });
      // No field anywhere in the body carries workspace/user identifiers.
      const serialized = init.body as string;
      expect(serialized).not.toMatch(/workspaceId|userId/i);
    });

    it("requests structured JSON output referencing the existing output schema", async () => {
      fetchMock.mockResolvedValue(fakeGroqResponse(validAssistantJson()));
      const provider = new GroqAIProvider("key");

      await provider.generateBreakdown("x");

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.response_format.type).toBe("json_schema");
      expect(body.response_format.json_schema.schema.properties.tasks).toBeDefined();
    });
  });

  describe("generateBreakdown — HTTP error handling", () => {
    it.each([400, 401, 403, 429, 500, 503])(
      "throws (without exposing the response body) on HTTP %i",
      async (status) => {
        fetchMock.mockResolvedValue(
          fakeGroqResponse(null, {
            ok: false,
            status,
            json: async () => ({ error: { message: "some internal groq detail" } }),
          }),
        );
        const provider = new GroqAIProvider("key");

        let caught: unknown;
        try {
          await provider.generateBreakdown("x");
        } catch (error) {
          caught = error;
        }

        expect(caught).toBeInstanceOf(Error);
        expect((caught as Error).message).toContain(String(status));
        // The raw body text must never surface in the thrown message.
        expect((caught as Error).message).not.toContain("some internal groq detail");
      },
    );

    it("throws on a network failure (fetch rejects)", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow();
    });

    it("throws on a timeout (fetch rejects with an abort-style error)", async () => {
      fetchMock.mockRejectedValue(
        new DOMException("The operation timed out", "TimeoutError"),
      );
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow();
    });
  });

  describe("generateBreakdown — malformed/invalid output", () => {
    it("throws when the response body is not valid JSON at all", async () => {
      fetchMock.mockResolvedValue(
        fakeGroqResponse(null, {
          json: async () => {
            throw new SyntaxError("Unexpected token");
          },
        }),
      );
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow();
    });

    it("throws when assistant content is missing", async () => {
      fetchMock.mockResolvedValue(
        fakeGroqResponse(undefined, {
          json: async () => ({ choices: [{ message: {} }] }),
        }),
      );
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow(/assistant content/i);
    });

    it("throws when choices is an empty array", async () => {
      fetchMock.mockResolvedValue(
        fakeGroqResponse(undefined, { json: async () => ({ choices: [] }) }),
      );
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow(/assistant content/i);
    });

    it("throws when assistant content is not valid JSON", async () => {
      fetchMock.mockResolvedValue(fakeGroqResponse("not { valid json"));
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow(/not valid JSON/i);
    });

    it("throws when the parsed output fails aiBreakdownOutputSchema (missing tasks)", async () => {
      fetchMock.mockResolvedValue(fakeGroqResponse(JSON.stringify({ notTasks: [] })));
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow();
    });

    it("throws when a task has an unrecognized extra field (schema is .strict())", async () => {
      fetchMock.mockResolvedValue(
        fakeGroqResponse(
          JSON.stringify({ tasks: [{ title: "ok", extraField: "not allowed" }] }),
        ),
      );
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow();
    });

    it("throws when priority is not one of the valid issue priorities", async () => {
      fetchMock.mockResolvedValue(
        fakeGroqResponse(
          JSON.stringify({ tasks: [{ title: "ok", priority: "SUPER_URGENT" }] }),
        ),
      );
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow();
    });

    it("accepts the boundary case of exactly MAX_TASKS_PER_BREAKDOWN tasks", async () => {
      fetchMock.mockResolvedValue(
        fakeGroqResponse(validAssistantJson(MAX_TASKS_PER_BREAKDOWN)),
      );
      const provider = new GroqAIProvider("key");

      const result = await provider.generateBreakdown("x");

      expect(result.tasks).toHaveLength(MAX_TASKS_PER_BREAKDOWN);
    });

    it("throws when the output has more than MAX_TASKS_PER_BREAKDOWN tasks", async () => {
      fetchMock.mockResolvedValue(
        fakeGroqResponse(validAssistantJson(MAX_TASKS_PER_BREAKDOWN + 1)),
      );
      const provider = new GroqAIProvider("key");

      await expect(provider.generateBreakdown("x")).rejects.toThrow();
    });
  });
});
