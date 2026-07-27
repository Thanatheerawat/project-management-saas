import { afterEach, describe, expect, it } from "vitest";

import { authOptions } from "@/lib/auth/auth.config";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

import { deleteTestUser, uniqueEmail } from "./helpers";

// CredentialsProvider(options) (next-auth/providers/credentials) returns
// `{ authorize: () => null, ...defaults, options }` — the real `authorize`
// we wrote in auth.config.ts lives under `.options.authorize`, not at the
// top level (NextAuth's own request handling merges `.options` over the
// defaults at runtime; see node_modules/next-auth/core/lib/providers.js).
// Calling the real function directly here exercises the login business
// logic (lookup, lockout, password check, audit log) against the real
// database without needing the app's HTTP/cookie layer, which is covered
// separately by the Playwright e2e login flow.
type AuthorizeFn = (
  credentials: Record<string, string> | undefined,
) => Promise<{ id: string } | null>;
const authorize = (
  authOptions.providers[0] as unknown as { options: { authorize: AuthorizeFn } }
).options.authorize;

describe("credentials authorize (login)", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("succeeds with correct credentials, updates lastLoginAt, and logs LOGIN_SUCCESS", async () => {
    const email = uniqueEmail("login-ok");
    createdEmails.push(email);
    const passwordHash = await hashPassword("correct horse battery staple");
    const user = await prisma.user.create({
      data: { email, name: "Login OK", passwordHash },
    });

    const result = await authorize({ email, password: "correct horse battery staple" });
    expect(result?.id).toBe(user.id);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.lastLoginAt).not.toBeNull();
    expect(updated.failedLoginAttempts).toBe(0);

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: "LOGIN_SUCCESS" },
    });
    expect(logs).toHaveLength(1);
  });

  it("rejects a wrong password, increments failedLoginAttempts, and logs LOGIN_FAILED", async () => {
    const email = uniqueEmail("login-bad-pw");
    createdEmails.push(email);
    const passwordHash = await hashPassword("correct horse battery staple");
    const user = await prisma.user.create({
      data: { email, name: "Login Bad", passwordHash },
    });

    const result = await authorize({ email, password: "wrong password" });
    expect(result).toBeNull();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.failedLoginAttempts).toBe(1);

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: "LOGIN_FAILED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("locks the account after 5 failed attempts", async () => {
    const email = uniqueEmail("login-lockout");
    createdEmails.push(email);
    const passwordHash = await hashPassword("correct horse battery staple");
    const user = await prisma.user.create({
      data: { email, name: "Login Lockout", passwordHash },
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await authorize({ email, password: "wrong password" });
    }

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.failedLoginAttempts).toBe(5);
    expect(updated.lockedUntil).not.toBeNull();
    expect(updated.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects a locked account even with the correct password, without another failed-attempt increment", async () => {
    const email = uniqueEmail("login-locked");
    createdEmails.push(email);
    const passwordHash = await hashPassword("correct horse battery staple");
    const user = await prisma.user.create({
      data: {
        email,
        name: "Login Locked",
        passwordHash,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const result = await authorize({ email, password: "correct horse battery staple" });
    expect(result).toBeNull();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.failedLoginAttempts).toBe(5);

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: "LOGIN_FAILED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("rejects a deactivated account", async () => {
    const email = uniqueEmail("login-inactive");
    createdEmails.push(email);
    const passwordHash = await hashPassword("correct horse battery staple");
    await prisma.user.create({
      data: { email, name: "Login Inactive", passwordHash, isActive: false },
    });

    const result = await authorize({ email, password: "correct horse battery staple" });
    expect(result).toBeNull();
  });

  it("rejects an email with no matching account without revealing that", async () => {
    const email = uniqueEmail("login-missing");

    const result = await authorize({ email, password: "anything" });
    expect(result).toBeNull();

    const logs = await prisma.auditLog.findMany({
      where: { action: "LOGIN_FAILED", userId: null },
    });
    const matching = logs.filter(
      (log) => (log.metadata as { email?: string } | null)?.email === email,
    );
    expect(matching).toHaveLength(1);

    // No user was ever created for this email, so it's not covered by
    // deleteTestUser in afterEach — clean up the orphan audit row directly.
    await prisma.auditLog.deleteMany({
      where: { id: { in: matching.map((log) => log.id) } },
    });
  });
});
