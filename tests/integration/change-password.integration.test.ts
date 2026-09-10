import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/users/password/route";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

import { deleteTestUser, sessionFor, uniqueEmail } from "./helpers";

// Same reasoning as resend-verification.integration.test.ts: the route
// reads the session via our auth() wrapper, which needs a real Next.js
// request context a plain Vitest call can't provide.
vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

function changePasswordRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/users/password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/users/password", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("returns 401 when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await POST(
      changePasswordRequest({ currentPassword: "whatever", newPassword: "Newpassword1" }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when the session references a deleted account", async () => {
    const email = uniqueEmail("changepw-deleted");
    const user = await prisma.user.create({
      data: {
        email,
        name: "Change PW Deleted",
        passwordHash: await hashPassword("old-pass"),
      },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));
    await prisma.user.delete({ where: { id: user.id } });

    const response = await POST(
      changePasswordRequest({ currentPassword: "old-pass", newPassword: "Newpassword1" }),
    );
    expect(response.status).toBe(404);
  });

  it("rejects a malformed request (new password shorter than 8 characters) with validation_error and leaves the password unchanged", async () => {
    const email = uniqueEmail("changepw-invalid");
    createdEmails.push(email);
    const originalHash = await hashPassword("old-password");
    const user = await prisma.user.create({
      data: { email, name: "Change PW Invalid", passwordHash: originalHash },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await POST(
      changePasswordRequest({ currentPassword: "old-password", newPassword: "short" }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.passwordHash).toBe(originalHash);
  });

  it("rejects a new password missing uppercase/number with validation_error and leaves the password unchanged", async () => {
    const email = uniqueEmail("changepw-weak");
    createdEmails.push(email);
    const originalHash = await hashPassword("old-password");
    const user = await prisma.user.create({
      data: { email, name: "Change PW Weak", passwordHash: originalHash },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await POST(
      changePasswordRequest({
        currentPassword: "old-password",
        newPassword: "alllowercase",
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.passwordHash).toBe(originalHash);
  });

  it("rejects an incorrect current password with current_password_incorrect and leaves the password unchanged", async () => {
    const email = uniqueEmail("changepw-wrong-current");
    createdEmails.push(email);
    const originalHash = await hashPassword("correct-password");
    const user = await prisma.user.create({
      data: { email, name: "Change PW Wrong Current", passwordHash: originalHash },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await POST(
      changePasswordRequest({
        currentPassword: "totally-wrong",
        newPassword: "Brand-new-password1",
      }),
    );
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("current_password_incorrect");
    // Never leaks a password hash or any other internal detail.
    expect(JSON.stringify(body)).not.toContain(originalHash);

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.passwordHash).toBe(originalHash);
  });

  it("rejects a new password identical to the current one with password_unchanged and leaves the password unchanged", async () => {
    const email = uniqueEmail("changepw-same");
    createdEmails.push(email);
    const originalHash = await hashPassword("Same-password-123");
    const user = await prisma.user.create({
      data: { email, name: "Change PW Same", passwordHash: originalHash },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await POST(
      changePasswordRequest({
        currentPassword: "Same-password-123",
        newPassword: "Same-password-123",
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("password_unchanged");

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.passwordHash).toBe(originalHash);
  });

  it("changes the password, updates the database, records PASSWORD_CHANGED, and never exposes the hash in the response", async () => {
    const email = uniqueEmail("changepw-ok");
    createdEmails.push(email);
    const originalHash = await hashPassword("old-password-123");
    const user = await prisma.user.create({
      data: { email, name: "Change PW OK", passwordHash: originalHash },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await POST(
      changePasswordRequest({
        currentPassword: "old-password-123",
        newPassword: "Brand-new-password-456",
      }),
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Password changed successfully");
    // The success envelope carries only a message — no hash, no user
    // object, nothing else.
    expect(Object.keys(body)).toEqual(["message"]);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.passwordHash).not.toBe(originalHash);
    await expect(
      verifyPassword("old-password-123", updated.passwordHash ?? ""),
    ).resolves.toBe(false);
    await expect(
      verifyPassword("Brand-new-password-456", updated.passwordHash ?? ""),
    ).resolves.toBe(true);

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: "PASSWORD_CHANGED" },
    });
    expect(logs).toHaveLength(1);
  });
});
