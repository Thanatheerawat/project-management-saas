import type { Session } from "next-auth";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/resend-verification/route";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  VERIFICATION_RESEND_COOLDOWN_MS,
  VERIFICATION_TOKEN_TTL_MS,
} from "@/repositories/auth/verification-token.repository";
import { emailService } from "@/services/auth/email.service";

import { deleteTestUser, uniqueEmail } from "./helpers";

// Same reasoning as profile-and-me.integration.test.ts: the route reads
// the session via our auth() wrapper, which needs a real Next.js request
// context a plain Vitest call can't provide.
vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

function sessionFor(userId: string): Session {
  return {
    user: { id: userId, role: "USER" },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  };
}

function resendRequest(): Request {
  return new Request("http://localhost:3000/api/auth/resend-verification", {
    method: "POST",
  });
}

async function tokenRowsFor(email: string) {
  return prisma.verificationToken.findMany({ where: { identifier: email } });
}

describe("POST /api/auth/resend-verification", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    vi.restoreAllMocks();
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("returns 401 when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await POST(resendRequest());
    expect(response.status).toBe(401);
  });

  it("returns 404 when the session references a deleted account", async () => {
    const email = uniqueEmail("resend-deleted");
    const user = await prisma.user.create({
      data: { email, name: "Resend Deleted", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));
    await prisma.user.delete({ where: { id: user.id } });

    const response = await POST(resendRequest());
    expect(response.status).toBe(404);
  });

  it("sends a new verification email and creates a token for an unverified user", async () => {
    const email = uniqueEmail("resend-ok");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Resend OK", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});

    const response = await POST(resendRequest());
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Verification email sent");

    const rows = await tokenRowsFor(email);
    expect(rows).toHaveLength(1);

    // Proves the route actually invoked emailService (which resolves to
    // MockEmailProvider in this test env, since EMAIL_PROVIDER is unset —
    // see tests/integration/setup.ts) rather than skipping it.
    expect(infoSpy).toHaveBeenCalledWith(
      "MOCK EMAIL — not actually sent",
      expect.objectContaining({ to: email, subject: "Verify your Orbit account" }),
    );
  });

  it("returns a controlled 502 and deletes the fresh token when the verification email fails to send", async () => {
    const email = uniqueEmail("resend-email-fails");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Resend Email Fails", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));
    const sendSpy = vi
      .spyOn(emailService, "sendVerificationEmail")
      .mockRejectedValueOnce(
        new Error("Resend request failed: validation_error (status 422)"),
      );
    const loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    const response = await POST(resendRequest());
    const body = (await response.json()) as { error: string; message: string };

    // Never a bare 500 — a distinct, controlled failure code instead.
    expect(response.status).toBe(502);
    expect(response.status).not.toBe(500);
    expect(body.error).toBe("email_delivery_failed");

    // Never leaks the raw provider error into the response.
    expect(JSON.stringify(body)).not.toContain("Resend request failed");
    expect(JSON.stringify(body)).not.toContain("validation_error");

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Failed to send verification email (resend)",
      expect.objectContaining({
        message: expect.stringContaining("Resend request failed"),
      }),
    );
    loggerErrorSpy.mockRestore();

    // The freshly-minted token was never delivered, so it must not be
    // left behind — no dangling unreachable token, no cooldown started
    // for a send that never happened.
    expect(await tokenRowsFor(email)).toHaveLength(0);
  });

  it("returns a safe no-op response and creates no token when already verified", async () => {
    const email = uniqueEmail("resend-verified");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: {
        email,
        name: "Resend Verified",
        passwordHash: "x",
        emailVerified: new Date(),
      },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await POST(resendRequest());
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Email is already verified");
    expect(await tokenRowsFor(email)).toHaveLength(0);
  });

  it("rejects a resend within the cooldown window with 429 rate_limited", async () => {
    const email = uniqueEmail("resend-cooldown");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Resend Cooldown", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));
    // A token "just created" — expires = now + full TTL.
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(generateToken()),
        expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    });

    const response = await POST(resendRequest());
    const body = (await response.json()) as {
      error: string;
      retryAfterSeconds: number;
    };

    expect(response.status).toBe(429);
    expect(body.error).toBe("rate_limited");
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
    expect(body.retryAfterSeconds).toBeLessThanOrEqual(60);
    // The pre-existing token must survive a rejected resend untouched.
    expect(await tokenRowsFor(email)).toHaveLength(1);
  });

  it("allows a resend once the cooldown has elapsed and replaces the old token", async () => {
    const email = uniqueEmail("resend-after-cooldown");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Resend After Cooldown", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));
    // Backdate creation so it's just past the cooldown window: expires is
    // TTL + (cooldown + 1s) in the past relative to "now + TTL", i.e.
    // createdAt = expires - TTL = now - (cooldown + 1s).
    const oldRawToken = generateToken();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(oldRawToken),
        expires: new Date(
          Date.now() +
            VERIFICATION_TOKEN_TTL_MS -
            (VERIFICATION_RESEND_COOLDOWN_MS + 1000),
        ),
      },
    });
    vi.spyOn(logger, "info").mockImplementation(() => {});

    const response = await POST(resendRequest());
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Verification email sent");

    const rows = await tokenRowsFor(email);
    expect(rows).toHaveLength(1);
    // The old token must be gone, not just supplemented by a new row.
    expect(rows[0]!.token).not.toBe(hashToken(oldRawToken));
  });
});
