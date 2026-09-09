import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/users/security-activity/route";
import { prisma } from "@/lib/prisma";

import { deleteTestUser, sessionFor, uniqueEmail } from "./helpers";

// Same reasoning as every other authenticated-route integration suite in
// this project (e.g. profile-and-me.integration.test.ts): the route reads
// the session via our auth() wrapper, which needs a real Next.js request
// context a plain Vitest call can't provide.
vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

interface SecurityActivityEventBody {
  id: string;
  action: string;
  occurredAt: string;
}

describe("GET /api/users/security-activity", () => {
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

  it("returns an empty events array for a user with no recorded activity", async () => {
    const email = uniqueEmail("secact-empty");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Empty Activity", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await GET();
    const body = (await response.json()) as { events: SecurityActivityEventBody[] };

    expect(response.status).toBe(200);
    expect(body.events).toEqual([]);
  });

  it("returns only the authenticated user's own events, newest first", async () => {
    const emailA = uniqueEmail("secact-a");
    const emailB = uniqueEmail("secact-b");
    createdEmails.push(emailA, emailB);
    const userA = await prisma.user.create({
      data: { email: emailA, name: "User A", passwordHash: "x" },
    });
    const userB = await prisma.user.create({
      data: { email: emailB, name: "User B", passwordHash: "x" },
    });

    // B's own event, created first — must never appear in A's response.
    await prisma.auditLog.create({ data: { userId: userB.id, action: "LOGIN_SUCCESS" } });

    const older = await prisma.auditLog.create({
      data: {
        userId: userA.id,
        action: "REGISTER",
        createdAt: new Date(Date.now() - 60_000),
      },
    });
    const newer = await prisma.auditLog.create({
      data: { userId: userA.id, action: "PASSWORD_CHANGED" },
    });

    mockedAuth.mockResolvedValue(sessionFor(userA.id));

    const response = await GET();
    const body = (await response.json()) as { events: SecurityActivityEventBody[] };

    expect(response.status).toBe(200);
    expect(body.events.map((e) => e.id)).toEqual([newer.id, older.id]);
    expect(body.events.every((e) => e.id !== undefined)).toBe(true);
    // Every returned action really did belong to A — nothing from B leaked
    // in (there'd be a 3rd, LOGIN_SUCCESS, entry if it had).
    expect(body.events).toHaveLength(2);
  });

  it("bounds the result to the latest 5 events even when more exist", async () => {
    const email = uniqueEmail("secact-bounded");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Bounded Activity", passwordHash: "x" },
    });
    // 7 events, strictly increasing createdAt so ordering is unambiguous.
    for (let i = 0; i < 7; i += 1) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN_SUCCESS",
          createdAt: new Date(Date.now() + i * 1000),
        },
      });
    }
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await GET();
    const body = (await response.json()) as { events: SecurityActivityEventBody[] };

    expect(response.status).toBe(200);
    expect(body.events).toHaveLength(5);
  });

  it("excludes PROFILE_UPDATED (not a security event) and never exposes metadata", async () => {
    const email = uniqueEmail("secact-metadata");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Metadata Safety", passwordHash: "x" },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_FAILED",
        // A realistic sensitive-ish metadata payload — must never surface
        // in the response at all, in any field.
        metadata: { reason: "bad_password", ip: "203.0.113.5" },
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PROFILE_UPDATED",
        metadata: { name: "New Name", bio: "Something private-ish" },
      },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await GET();
    const body = (await response.json()) as { events: SecurityActivityEventBody[] };
    const raw = JSON.stringify(body);

    expect(response.status).toBe(200);
    // PROFILE_UPDATED is excluded entirely — only the LOGIN_FAILED event
    // should come back.
    expect(body.events).toHaveLength(1);
    expect(body.events[0]!.action).toBe("LOGIN_FAILED");
    // No metadata field on the DTO at all, and none of its values leaked
    // through some other field either.
    expect(body.events[0]!).not.toHaveProperty("metadata");
    expect(raw).not.toContain("bad_password");
    expect(raw).not.toContain("203.0.113.5");
    expect(raw).not.toContain("Something private-ish");
  });
});
