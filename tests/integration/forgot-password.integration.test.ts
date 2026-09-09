import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { deleteTestUser, uniqueEmail } from "./helpers";

// M8.3: mocked at the emailService boundary (one level above the M8.1
// provider layer, which already has its own dedicated mock-vs-Resend
// tests) so this suite can assert two things a plain "does a token exist"
// check can't: that the route actually invokes the email service for a
// real active user, and — the real point — that a provider failure never
// changes this route's response shape (see forgot-password/route.ts's own
// comment on the account-enumeration risk that would otherwise create).
const mockSendPasswordResetEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/services/auth/email.service", () => ({
  emailService: {
    sendPasswordResetEmail: mockSendPasswordResetEmail,
    sendVerificationEmail: vi.fn(),
    send: vi.fn(),
  },
}));
const { POST } = await import("@/app/api/auth/forgot-password/route");

function forgotPasswordRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const GENERIC_MESSAGE =
  "If an account with that email exists, a reset link has been sent.";

describe("POST /api/auth/forgot-password", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    mockSendPasswordResetEmail.mockClear();
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("creates a reset token and PASSWORD_RESET_REQUESTED audit log for an active user", async () => {
    const email = uniqueEmail("forgot-active");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Forgot Active", passwordHash: "x" },
    });

    const response = await POST(forgotPasswordRequest({ email }));
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe(GENERIC_MESSAGE);

    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user.id },
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: "PASSWORD_RESET_REQUESTED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("returns the same generic message for an unknown email without creating a token", async () => {
    const email = uniqueEmail("forgot-missing");

    const response = await POST(forgotPasswordRequest({ email }));
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe(GENERIC_MESSAGE);

    const tokens = await prisma.passwordResetToken.findMany({
      where: { user: { email } },
    });
    expect(tokens).toHaveLength(0);
  });

  it("does not create a token for a deactivated account", async () => {
    const email = uniqueEmail("forgot-inactive");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Forgot Inactive", passwordHash: "x", isActive: false },
    });

    const response = await POST(forgotPasswordRequest({ email }));
    expect(response.status).toBe(200);

    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user.id },
    });
    expect(tokens).toHaveLength(0);
  });

  it("invokes emailService.sendPasswordResetEmail with the reset link for an active user", async () => {
    const email = uniqueEmail("forgot-email-sent");
    createdEmails.push(email);
    await prisma.user.create({
      data: { email, name: "Forgot Email Sent", passwordHash: "x" },
    });

    await POST(forgotPasswordRequest({ email }));

    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [sentTo, resetUrl] = mockSendPasswordResetEmail.mock.calls[0] as [
      string,
      string,
    ];
    expect(sentTo).toBe(email);
    expect(resetUrl).toContain("/reset-password?token=");
  });

  it("never calls emailService for an unknown email or a deactivated account", async () => {
    await POST(forgotPasswordRequest({ email: uniqueEmail("forgot-no-email-1") }));

    const email = uniqueEmail("forgot-no-email-2");
    createdEmails.push(email);
    await prisma.user.create({
      data: { email, name: "Forgot No Email", passwordHash: "x", isActive: false },
    });
    await POST(forgotPasswordRequest({ email }));

    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns the same generic 200 response even when the email provider fails", async () => {
    // The real point of this test: a provider failure for a *real* active
    // account must not produce a response distinguishable from the
    // unknown-email case above — see the try/catch around
    // emailService.sendPasswordResetEmail in forgot-password/route.ts.
    // Without it, a Resend outage would turn this route into an account
    // enumeration oracle (500 only for emails that exist).
    const email = uniqueEmail("forgot-provider-fails");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Forgot Provider Fails", passwordHash: "x" },
    });
    mockSendPasswordResetEmail.mockRejectedValueOnce(
      new Error("Resend request failed: invalid_api_key (status 401)"),
    );

    const response = await POST(forgotPasswordRequest({ email }));
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe(GENERIC_MESSAGE);

    // The token is still created — only the send attempt failed, not the
    // request that would let the user retry via a fresh forgot-password
    // submission (or, if delivery is later fixed, this exact token is
    // still valid — no token issued needlessly disappears on a send
    // failure).
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user.id },
    });
    expect(tokens).toHaveLength(1);
  });
});
