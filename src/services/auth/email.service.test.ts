import { afterEach, describe, expect, it, vi } from "vitest";

// email.service.ts resolves its provider once at module scope from `env`,
// so exercising different EMAIL_PROVIDER/NODE_ENV combinations requires a
// fresh module instance per case — vi.resetModules() + vi.doMock() per
// test, same reasoning the M8.1/M8.2 route-level integration tests use
// for mocking at a service boundary, just one layer lower.
const mockCreateEmailProvider = vi.fn();
vi.mock("@/services/email/email-provider-factory", () => ({
  createEmailProvider: (...args: unknown[]) => mockCreateEmailProvider(...args),
}));

async function loadEmailService(envOverrides: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("@/config/env", () => ({
    env: {
      NODE_ENV: "development",
      EMAIL_PROVIDER: "mock",
      RESEND_API_KEY: undefined,
      EMAIL_FROM: undefined,
      ...envOverrides,
    },
  }));
  return import("@/services/auth/email.service");
}

describe("emailService production mock guard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses the factory-resolved provider when EMAIL_PROVIDER=mock outside production", async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);
    mockCreateEmailProvider.mockReturnValue({ send: mockSend });

    const { emailService } = await loadEmailService({
      NODE_ENV: "development",
      EMAIL_PROVIDER: "mock",
    });
    await emailService.send({ to: "a@b.com", subject: "s", body: "b" });

    expect(mockCreateEmailProvider).toHaveBeenCalledWith("mock", {
      resendApiKey: undefined,
      emailFrom: undefined,
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("routes to the factory (Resend) when production is correctly configured", async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);
    mockCreateEmailProvider.mockReturnValue({ send: mockSend });

    const { emailService } = await loadEmailService({
      NODE_ENV: "production",
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "fake-test-key",
      EMAIL_FROM: "Orbit <from@orbit.dev>",
    });
    await emailService.send({ to: "a@b.com", subject: "s", body: "b" });

    expect(mockCreateEmailProvider).toHaveBeenCalledWith("resend", {
      resendApiKey: "fake-test-key",
      emailFrom: "Orbit <from@orbit.dev>",
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("never calls the factory and throws instead of silently using mock in production", async () => {
    const { emailService } = await loadEmailService({
      NODE_ENV: "production",
      EMAIL_PROVIDER: "mock",
    });

    await expect(
      emailService.send({ to: "a@b.com", subject: "s", body: "b" }),
    ).rejects.toThrow(/EMAIL_PROVIDER=mock is not permitted/i);

    expect(mockCreateEmailProvider).not.toHaveBeenCalled();
  });

  it("never includes the raw message body (e.g. a reset token) in the thrown error", async () => {
    const { emailService } = await loadEmailService({
      NODE_ENV: "production",
      EMAIL_PROVIDER: "mock",
    });
    const secretToken = "super-secret-reset-token-should-never-leak";

    let thrown: unknown;
    try {
      await emailService.sendPasswordResetEmail(
        "a@b.com",
        `https://orbit.dev/reset?token=${secretToken}`,
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).not.toContain(secretToken);
  });
});
