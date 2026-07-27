import { afterEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/register/route";
import { hashToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

import { deleteTestUser, uniqueEmail } from "./helpers";

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
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("creates a user, a verification token, and a REGISTER audit log", async () => {
    const email = uniqueEmail("register");
    createdEmails.push(email);

    const response = await POST(
      registerRequest({
        name: "Test User",
        email,
        password: "correct horse battery staple",
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
    expect(user?.passwordHash).not.toBe("correct horse battery staple");

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

  it("rejects a duplicate email with 409 and does not create a second user", async () => {
    const email = uniqueEmail("register-dup");
    createdEmails.push(email);

    const first = await POST(
      registerRequest({ name: "First", email, password: "correct horse battery" }),
    );
    expect(first.status).toBe(201);

    const second = await POST(
      registerRequest({ name: "Second", email, password: "another password" }),
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
