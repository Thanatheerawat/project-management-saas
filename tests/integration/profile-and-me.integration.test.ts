import type { Session } from "next-auth";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/users/me/route";
import { PATCH } from "@/app/api/users/profile/route";
import { prisma } from "@/lib/prisma";

import { deleteTestUser, uniqueEmail } from "./helpers";

// GET/PATCH read the session via our auth() wrapper (next-auth's
// getServerSession), which needs a real Next.js request context that a
// plain Vitest call can't provide. Mocking it here isolates exactly what
// this suite is meant to cover — route + repository + real database — the
// cookie-based session itself is exercised end-to-end by the Playwright
// e2e suite instead.
vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

function sessionFor(userId: string): Session {
  return {
    user: { id: userId, role: "USER" },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  };
}

function profileRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/users/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/users/me", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("returns 401 when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the current user's profile fields", async () => {
    const email = uniqueEmail("me-ok");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Me OK", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await GET();
    const body = (await response.json()) as {
      id: string;
      email: string;
      name: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.id).toBe(user.id);
    expect(body.email).toBe(email);
    expect(body.name).toBe("Me OK");
  });

  it("returns 404 when the session references a deleted account", async () => {
    const email = uniqueEmail("me-deleted");
    const user = await prisma.user.create({
      data: { email, name: "Me Deleted", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));
    await prisma.user.delete({ where: { id: user.id } });

    const response = await GET();
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/users/profile", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(createdEmails.splice(0).map(deleteTestUser));
  });

  it("returns 401 when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await PATCH(profileRequest({ name: "New Name" }));
    expect(response.status).toBe(401);
  });

  it("updates the profile and logs PROFILE_UPDATED", async () => {
    const email = uniqueEmail("profile-ok");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Old Name", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await PATCH(profileRequest({ name: "New Name" }));
    const body = (await response.json()) as { name: string };

    expect(response.status).toBe(200);
    expect(body.name).toBe("New Name");

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.name).toBe("New Name");

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: "PROFILE_UPDATED" },
    });
    expect(logs).toHaveLength(1);
    expect((logs[0].metadata as { name?: string } | null)?.name).toBe("New Name");
  });

  it("rejects an invalid payload with 400 validation_error", async () => {
    const email = uniqueEmail("profile-invalid");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Old Name", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await PATCH(profileRequest({ image: "not-a-url" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");
  });
});
