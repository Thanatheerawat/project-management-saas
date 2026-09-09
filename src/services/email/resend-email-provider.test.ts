import { afterEach, describe, expect, it, vi } from "vitest";

import { ResendEmailProvider } from "@/services/email/resend-email-provider";

// Mocks the whole `resend` package — no real network call is ever made by
// this test file. `vi.mock` is hoisted above the imports above by
// Vitest, so `sendMock` is declared with `vi.hoisted` to be safely
// referenced inside the (also hoisted) factory below.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe("ResendEmailProvider", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("throws when the API key is missing (undefined)", () => {
      expect(
        () => new ResendEmailProvider(undefined as unknown as string, "from@x.com"),
      ).toThrow(/non-empty API key/i);
    });

    it("throws when the API key is an empty string", () => {
      expect(() => new ResendEmailProvider("", "from@x.com")).toThrow(
        /non-empty API key/i,
      );
    });

    it("throws when the from address is missing", () => {
      expect(() => new ResendEmailProvider("key", "")).toThrow(/non-empty from address/i);
    });

    it("never calls the Resend SDK as a side effect of construction with valid config", () => {
      const provider = new ResendEmailProvider("key", "from@x.com");
      expect(provider).toBeInstanceOf(ResendEmailProvider);
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe("send", () => {
    it("calls the Resend SDK with the mapped fields and resolves on success", async () => {
      sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
      const provider = new ResendEmailProvider("key", "Orbit <from@x.com>");

      await provider.send({
        to: "user@example.com",
        subject: "Verify your Orbit account",
        body: "Verify your email: https://example.com/verify?token=abc",
      });

      expect(sendMock).toHaveBeenCalledWith({
        from: "Orbit <from@x.com>",
        to: "user@example.com",
        subject: "Verify your Orbit account",
        text: "Verify your email: https://example.com/verify?token=abc",
      });
    });

    it("throws a safe error (no API key or raw message leaked) when Resend returns an error", async () => {
      const secretApiKey = "sk_test_super_secret_value";
      sendMock.mockResolvedValue({
        data: null,
        error: {
          message: "some internal detail an attacker shouldn't see",
          statusCode: 401,
          name: "invalid_api_key",
        },
      });
      const provider = new ResendEmailProvider(secretApiKey, "from@x.com");

      let thrown: unknown;
      try {
        await provider.send({ to: "a@b.com", subject: "s", body: "b" });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      const message = (thrown as Error).message;
      expect(message).toContain("invalid_api_key");
      expect(message).toContain("401");
      expect(message).not.toContain("some internal detail");
      expect(message).not.toContain(secretApiKey);
    });
  });
});
