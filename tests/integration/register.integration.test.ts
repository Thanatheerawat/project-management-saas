import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/register/route";
import { hashToken } from "@/lib/auth/tokens";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { deleteTestUser, uniqueEmail } from "./helpers";

// Mocked at the emailService boundary (same approach as
// forgot-password.integration.test.ts) so the "delivery fails mid-
// registration" scenario can be forced deterministically — the real
// mock/Resend providers have no way to simulate a rejection on demand.
// vi.mock's factory is hoisted above all imports/consts, so the mock fn
// it references must be created via vi.hoisted rather than a plain const.
const { mockSendVerificationEmail } = vi.hoisted(() => ({
  mockSendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/services/auth/email.service", () => ({
  emailService: {
    sendVerificationEmail: mockSendVerificationEmail,
    sendPasswordResetEmail: vi.fn(),
    send: vi.fn(),
  },
}));

function registerRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    mockSendVerificationEmail.mockClear();
    mockSendVerificationEmail.mockResolvedValue(undefined);
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("creates a user, a verification token, and a REGISTER audit log", async () => {
    const email = uniqueEmail("register");
    createdEmails.push(email);

    const response = await POST(
      registerRequest({
        name: "Test User",
        email,
        password: "CorrectHorseBattery1",
      }),
    );
    const body = (await response.json()) as {
      id: string;
      email: string;
      mockVerifyUrl: string;
    };

    expect(response.status).toBe(201);
    expect(body.email).toBe(email);
    expect(body.mockVerifyUrl).toContain("/verify-email");

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user?.emailVerified).toBeNull();
    expect(user?.isActive).toBe(true);
    expect(user?.passwordHash).not.toBe("CorrectHorseBattery1");

    const rawToken = new URL(
      body.mockVerifyUrl,
      "http://localhost:3000",
    ).searchParams.get("token");
    const tokenRow = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: { identifier: email, token: hashToken(rawToken ?? "") },
      },
    });
    expect(tokenRow).not.toBeNull();

    const auditRows = await prisma.auditLog.findMany({
      where: { userId: user?.id, action: "REGISTER" },
    });
    expect(auditRows).toHaveLength(1);
  });

  it("still returns 201 and creates a usable account when the verification email fails to send", async () => {
    const email = uniqueEmail("register-email-fails");
    createdEmails.push(email);
    mockSendVerificationEmail.mockRejectedValueOnce(
      new Error("Resend request failed: validation_error (status 422)"),
    );
    const loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    const response = await POST(
      registerRequest({
        name: "Test User",
        email,
        password: "CorrectHorseBattery1",
      }),
    );
    const body = (await response.json()) as {
      id: string;
      email: string;
      mockVerifyUrl: string;
    };

    // Registration itself succeeded — account creation is not the thing
    // that failed, only a background side effect of it.
    expect(response.status).toBe(201);
    expect(body.email).toBe(email);
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);

    // Never leaks the raw provider error into the response.
    expect(JSON.stringify(body)).not.toContain("Resend request failed");
    expect(JSON.stringify(body)).not.toContain("validation_error");

    // The failure was logged server-side, not swallowed silently.
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Failed to send verification email",
      expect.objectContaining({
        message: expect.stringContaining("Resend request failed"),
      }),
    );
    loggerErrorSpy.mockRestore();

    // The user and its verification token both still exist — nothing
    // was rolled back, and the account remains in the same unverified
    // state the app already treats as normal.
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user?.emailVerified).toBeNull();
    expect(user?.isActive).toBe(true);

    const rawToken = new URL(
      body.mockVerifyUrl,
      "http://localhost:3000",
    ).searchParams.get("token");
    const tokenRow = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: { identifier: email, token: hashToken(rawToken ?? "") },
      },
    });
    expect(tokenRow).not.toBeNull();

    // Registration's own success path (audit log) is unaffected.
    const auditRows = await prisma.auditLog.findMany({
      where: { userId: user?.id, action: "REGISTER" },
    });
    expect(auditRows).toHaveLength(1);
  });

  it("rejects a duplicate email with 409 and does not create a second user", async () => {
    const email = uniqueEmail("register-dup");
    createdEmails.push(email);

    const first = await POST(
      registerRequest({ name: "First", email, password: "CorrectHorseBattery1" }),
    );
    expect(first.status).toBe(201);

    const second = await POST(
      registerRequest({ name: "Second", email, password: "AnotherPassword1" }),
    );
    const body = (await second.json()) as { error: string };

    expect(second.status).toBe(409);
    expect(body.error).toBe("email_taken");

    const users = await prisma.user.findMany({ where: { email } });
    expect(users).toHaveLength(1);
  });

  it("rejects an invalid payload with 400 validation_error", async () => {
    const response = await POST(
      registerRequest({ name: "", email: "not-an-email", password: "short" }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");
  });
});
