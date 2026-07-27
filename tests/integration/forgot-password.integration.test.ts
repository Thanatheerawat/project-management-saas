import { afterEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/forgot-password/route";
import { prisma } from "@/lib/prisma";

import { deleteTestUser, uniqueEmail } from "./helpers";

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
});
