import { afterEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/reset-password/route";
import { verifyPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

import { deleteTestUser, uniqueEmail } from "./helpers";

function resetPasswordRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("resets the password, marks the token used, and logs PASSWORD_RESET_COMPLETED", async () => {
    const email = uniqueEmail("reset-ok");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Reset OK", passwordHash: "old-hash" },
    });
    const rawToken = generateToken();
    const tokenRow = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await POST(
      resetPasswordRequest({ token: rawToken, newPassword: "brand new password" }),
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Password reset successfully");

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await expect(
      verifyPassword("brand new password", updated.passwordHash ?? ""),
    ).resolves.toBe(true);

    const usedToken = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { id: tokenRow.id },
    });
    expect(usedToken.usedAt).not.toBeNull();

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: "PASSWORD_RESET_COMPLETED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("rejects an expired token and leaves the password unchanged", async () => {
    const email = uniqueEmail("reset-expired");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Reset Expired", passwordHash: "original-hash" },
    });
    const rawToken = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await POST(
      resetPasswordRequest({ token: rawToken, newPassword: "brand new password" }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_token");

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.passwordHash).toBe("original-hash");
  });

  it("rejects an already-used token", async () => {
    const email = uniqueEmail("reset-used");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Reset Used", passwordHash: "x" },
    });
    const rawToken = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      },
    });

    const response = await POST(
      resetPasswordRequest({ token: rawToken, newPassword: "brand new password" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects an unknown token", async () => {
    const response = await POST(
      resetPasswordRequest({ token: generateToken(), newPassword: "brand new password" }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_token");
  });
});
