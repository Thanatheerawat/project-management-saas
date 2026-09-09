import { describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";
import { MockEmailProvider } from "@/services/email/mock-email-provider";

describe("MockEmailProvider", () => {
  it("resolves without making any network call", async () => {
    const provider = new MockEmailProvider();
    await expect(
      provider.send({ to: "a@b.com", subject: "Hi", body: "Hello" }),
    ).resolves.toBeUndefined();
  });

  it("logs the message instead of sending it", async () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    const provider = new MockEmailProvider();

    await provider.send({
      to: "user@example.com",
      subject: "Verify your Orbit account",
      body: "Verify your email: https://example.com/verify?token=abc",
    });

    expect(infoSpy).toHaveBeenCalledWith(
      "MOCK EMAIL — not actually sent",
      expect.objectContaining({
        to: "user@example.com",
        subject: "Verify your Orbit account",
      }),
    );

    infoSpy.mockRestore();
  });
});
