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

  it("includes the M8.5 rich-profile fields and never a password hash", async () => {
    const email = uniqueEmail("me-rich");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: {
        email,
        name: "Me Rich",
        passwordHash: "x",
        jobTitle: "Frontend Developer",
        bio: "I like computers.",
        location: "Bangkok, Thailand",
        timezone: "Asia/Bangkok",
        website: "https://ada.dev",
      },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await GET();
    const body = (await response.json()) as {
      jobTitle: string | null;
      bio: string | null;
      location: string | null;
      timezone: string | null;
      website: string | null;
      createdAt: string;
      lastLoginAt: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.jobTitle).toBe("Frontend Developer");
    expect(body.bio).toBe("I like computers.");
    expect(body.location).toBe("Bangkok, Thailand");
    expect(body.timezone).toBe("Asia/Bangkok");
    expect(body.website).toBe("https://ada.dev");
    expect(body.createdAt).toBeTruthy();
    expect(body.lastLoginAt).toBeNull();
    expect(body).not.toHaveProperty("passwordHash");
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

  // --- M8.5: rich profile fields ---------------------------------------

  it("updates every allowed rich-profile field and persists them in the database", async () => {
    const email = uniqueEmail("profile-rich-ok");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Old Name", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await PATCH(
      profileRequest({
        name: "Ada Lovelace",
        jobTitle: "Frontend Developer",
        bio: "I like computers.",
        location: "Bangkok, Thailand",
        timezone: "Asia/Bangkok",
        website: "https://ada.dev",
      }),
    );
    const body = (await response.json()) as {
      jobTitle: string | null;
      bio: string | null;
      location: string | null;
      timezone: string | null;
      website: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.jobTitle).toBe("Frontend Developer");
    expect(body.bio).toBe("I like computers.");
    expect(body.location).toBe("Bangkok, Thailand");
    expect(body.timezone).toBe("Asia/Bangkok");
    expect(body.website).toBe("https://ada.dev");
    // Never a raw spread of the Prisma row — the response is an explicit
    // whitelist (see route.ts), so no password material can leak here.
    expect(body).not.toHaveProperty("passwordHash");

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.jobTitle).toBe("Frontend Developer");
    expect(updated.bio).toBe("I like computers.");
    expect(updated.location).toBe("Bangkok, Thailand");
    expect(updated.timezone).toBe("Asia/Bangkok");
    expect(updated.website).toBe("https://ada.dev");
  });

  it("never modifies another user's profile fields", async () => {
    const emailA = uniqueEmail("profile-scope-a");
    const emailB = uniqueEmail("profile-scope-b");
    createdEmails.push(emailA, emailB);
    const userA = await prisma.user.create({
      data: { email: emailA, name: "User A", passwordHash: "x" },
    });
    const userB = await prisma.user.create({
      data: {
        email: emailB,
        name: "User B",
        jobTitle: "Original Title",
        passwordHash: "x",
      },
    });
    // The route has no target-user parameter at all — it only ever reads
    // session.user.id — so there is no field to inject a different user's
    // id into. This proves that scoping directly: PATCH as A, confirm B
    // (never named in the request) is untouched.
    mockedAuth.mockResolvedValue(sessionFor(userA.id));

    await PATCH(profileRequest({ jobTitle: "Hijacked Title" }));

    const untouchedB = await prisma.user.findUniqueOrThrow({ where: { id: userB.id } });
    expect(untouchedB.jobTitle).toBe("Original Title");
    expect(untouchedB.name).toBe("User B");
  });

  it("silently ignores protected fields (role, isActive, passwordHash, email) even when present in the request body", async () => {
    const email = uniqueEmail("profile-protected");
    createdEmails.push(email);
    const originalHash = "original-hash";
    const user = await prisma.user.create({
      data: { email, name: "Old Name", passwordHash: originalHash, role: "USER" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await PATCH(
      profileRequest({
        name: "New Name",
        // None of these are keys profileSchema declares, so Zod strips
        // them before userRepository.updateProfile's own explicitly
        // narrow param type (a second, independent layer) is even
        // reached — see profile.schema.ts / user.repository.ts.
        role: "SUPER_ADMIN",
        isActive: false,
        passwordHash: "hacked-hash",
        email: "hijacked@example.com",
        id: "some-other-id",
      }),
    );

    // Extra unknown keys are silently stripped (Zod's default, non-strict
    // behavior — matching every other schema in this codebase), not a
    // validation error — the request still succeeds for the legitimate
    // field.
    expect(response.status).toBe(200);

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.name).toBe("New Name");
    expect(unchanged.role).toBe("USER");
    expect(unchanged.isActive).toBe(true);
    expect(unchanged.passwordHash).toBe(originalHash);
    expect(unchanged.email).toBe(email);
    expect(unchanged.id).toBe(user.id);
  });

  it("rejects an invalid website with 400 validation_error and leaves the profile unchanged", async () => {
    const email = uniqueEmail("profile-bad-website");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Old Name", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await PATCH(profileRequest({ website: "not-a-valid-url" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.website).toBeNull();
  });

  it("rejects a bio over 500 characters with 400 validation_error", async () => {
    const email = uniqueEmail("profile-bad-bio");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Old Name", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await PATCH(profileRequest({ bio: "a".repeat(501) }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");
  });

  it("rejects a timezone that isn't a canonical IANA identifier with 400 validation_error", async () => {
    const email = uniqueEmail("profile-bad-timezone");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: { email, name: "Old Name", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await PATCH(profileRequest({ timezone: "Not/AZone" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");
  });

  it("treats empty-string optional fields as null, both freshly and when clearing a previously-set value", async () => {
    const email = uniqueEmail("profile-clear-fields");
    createdEmails.push(email);
    const user = await prisma.user.create({
      data: {
        email,
        name: "Old Name",
        passwordHash: "x",
        jobTitle: "Was Set",
        bio: "Was set",
        location: "Was set",
        timezone: "Asia/Bangkok",
        website: "https://old.example.com",
      },
    });
    mockedAuth.mockResolvedValue(sessionFor(user.id));

    const response = await PATCH(
      profileRequest({ jobTitle: "", bio: "", location: "", timezone: "", website: "" }),
    );
    const body = (await response.json()) as {
      jobTitle: string | null;
      bio: string | null;
      location: string | null;
      timezone: string | null;
      website: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.jobTitle).toBeNull();
    expect(body.bio).toBeNull();
    expect(body.location).toBeNull();
    expect(body.timezone).toBeNull();
    expect(body.website).toBeNull();

    const cleared = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(cleared.jobTitle).toBeNull();
    expect(cleared.bio).toBeNull();
    expect(cleared.location).toBeNull();
    expect(cleared.timezone).toBeNull();
    expect(cleared.website).toBeNull();
  });
});
