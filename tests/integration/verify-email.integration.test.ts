import { afterEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/verify-email/route";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

import { deleteTestUser, uniqueEmail } from "./helpers";

function verifyEmailRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/verify-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/verify-email", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("verifies the email, deletes the token, and logs EMAIL_VERIFIED", async () => {
    const email = uniqueEmail("verify-ok");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Verify OK", passwordHash: "x" },
    });
    const rawToken = generateToken();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(rawToken),
        expires: new Date(Date.now() + 60_000),
      },
    });

    const response = await POST(verifyEmailRequest({ email, token: rawToken }));
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Email verified successfully");

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.emailVerified).not.toBeNull();

    const tokenRow = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token: hashToken(rawToken) } },
    });
    expect(tokenRow).toBeNull();

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: "EMAIL_VERIFIED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("rejects an expired token", async () => {
    const email = uniqueEmail("verify-expired");
    createdEmails.push(email);
    await prisma.user.create({
      data: { email, name: "Verify Expired", passwordHash: "x" },
    });
    const rawToken = generateToken();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(rawToken),
        expires: new Date(Date.now() - 1000),
      },
    });

    const response = await POST(verifyEmailRequest({ email, token: rawToken }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_token");
  });

  it("rejects a token that doesn't match the email", async () => {
    const email = uniqueEmail("verify-mismatch");
    createdEmails.push(email);
    await prisma.user.create({
      data: { email, name: "Verify Mismatch", passwordHash: "x" },
    });
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(generateToken()),
        expires: new Date(Date.now() + 60_000),
      },
    });

    const response = await POST(verifyEmailRequest({ email, token: generateToken() }));
    expect(response.status).toBe(400);
  });

  it("returns 404 when the token is valid but the account no longer exists", async () => {
    const email = uniqueEmail("verify-no-user");
    const rawToken = generateToken();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(rawToken),
        expires: new Date(Date.now() + 60_000),
      },
    });

    const response = await POST(verifyEmailRequest({ email, token: rawToken }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  });
});
