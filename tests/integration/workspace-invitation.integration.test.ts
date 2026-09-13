import type { Session } from "next-auth";
import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { emailService } from "@/services/auth/email.service";

import {
  deleteTestUser,
  deleteTestWorkspace,
  sessionFor,
  uniqueEmail,
  uniqueSlug,
} from "./helpers";

// The shared sessionFor() helper (helpers.ts) deliberately omits `email` —
// no other integration suite has needed it. The accept-invitation route is
// the first to actually check `session.user.email` against real business
// data (the token/account binding — see its own comment), so this local
// helper adds it without changing the shared helper's contract for every
// other test file that already relies on its current shape.
function sessionWithEmail(userId: string, email: string): Session {
  return {
    user: { id: userId, role: "USER", email },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  };
}

// Same reasoning as every other authenticated-route integration suite in
// this project: the routes read the session via our auth() wrapper, which
// needs a real Next.js request context a plain Vitest call can't provide.
vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

const { POST: createInvitation } =
  await import("@/app/api/workspaces/[workspaceId]/invitations/route");
const { POST: acceptInvitation } = await import("@/app/api/invitations/accept/route");

function jsonRequest(url: string, body?: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function workspaceCtx(workspaceId: string) {
  return { params: Promise.resolve({ workspaceId }) };
}

function inviteRequest(workspaceId: string, body: unknown) {
  return jsonRequest(
    `http://localhost:3000/api/workspaces/${workspaceId}/invitations`,
    body,
  );
}

function acceptRequest(token: string) {
  return jsonRequest("http://localhost:3000/api/invitations/accept", { token });
}

async function createUser(prefix: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x" },
  });
  return { id: user.id, email };
}

async function createWorkspace(ownerId: string, name: string) {
  return prisma.workspace.create({
    data: {
      name,
      slug: uniqueSlug(name.toLowerCase().replace(/\s+/g, "-")),
      members: { create: { userId: ownerId, role: "OWNER" } },
    },
  });
}

describe("Workspace invitation", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    vi.restoreAllMocks();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setup() {
    const owner = await createUser("inv-owner");
    const admin = await createUser("inv-admin");
    const member = await createUser("inv-member");
    emails.push(owner.email, admin.email, member.email);

    const workspace = await createWorkspace(owner.id, "Invite Workspace");
    workspaceIds.push(workspace.id);
    await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: admin.id, role: "ADMIN" },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: member.id, role: "MEMBER" },
    });

    return { workspace, owner, admin, member };
  }

  // --- Authorization ----------------------------------------------------

  it("returns 401 for an unauthenticated caller", async () => {
    const { workspace } = await setup();
    mockedAuth.mockResolvedValue(null);

    const response = await createInvitation(
      inviteRequest(workspace.id, { email: uniqueEmail("nobody"), role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when the caller is only a MEMBER, not ADMIN+", async () => {
    const { workspace, member } = await setup();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createInvitation(
      inviteRequest(workspace.id, { email: uniqueEmail("nobody"), role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(403);
  });

  // --- Existing account: preserves the old add-member outcome -----------

  it("adds an existing account directly, with no invitation created", async () => {
    const { workspace, admin } = await setup();
    const target = await createUser("inv-existing");
    emails.push(target.email);
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const sendSpy = vi.spyOn(emailService, "sendWorkspaceInvitationEmail");

    const response = await createInvitation(
      inviteRequest(workspace.id, { email: target.email, role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { status: string; user: { email: string } };

    expect(response.status).toBe(201);
    expect(body.status).toBe("added");
    expect(body.user.email).toBe(target.email);
    // No invitation email for an account that already exists — this
    // branch never touches emailService at all.
    expect(sendSpy).not.toHaveBeenCalled();
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: target.id } },
    });
    expect(membership).not.toBeNull();
    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: workspace.id, email: target.email },
    });
    expect(invitations).toHaveLength(0);
  });

  it("returns 409 when the existing account is already a member", async () => {
    const { workspace, admin, member } = await setup();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await createInvitation(
      inviteRequest(workspace.id, { email: member.email, role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(409);
  });

  it("recognizes an existing account case-insensitively and adds them directly, without inviting", async () => {
    const { workspace, admin } = await setup();
    const email = uniqueEmail("inv-mixedcase");
    // Stored exactly as a real account might have it — mixed case, not
    // normalized (User.email is deliberately untouched by this hardening).
    const mixedCaseEmail = `Mixed.Case.${email}`;
    const target = await prisma.user.create({
      data: { email: mixedCaseEmail, name: "Mixed Case", passwordHash: "x" },
    });
    emails.push(mixedCaseEmail);
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const sendSpy = vi.spyOn(emailService, "sendWorkspaceInvitationEmail");

    // Admin types a different case than how the account is actually
    // stored — this must still resolve to the same existing account.
    const response = await createInvitation(
      inviteRequest(workspace.id, {
        email: mixedCaseEmail.toUpperCase(),
        role: "MEMBER",
      }),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { status: string; user: { email: string } };

    expect(response.status).toBe(201);
    expect(body.status).toBe("added");
    expect(body.user.email).toBe(mixedCaseEmail);
    expect(sendSpy).not.toHaveBeenCalled();
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: target.id } },
    });
    expect(membership).not.toBeNull();
  });

  // --- New invitation -----------------------------------------------------

  it("creates a hashed, expiring invitation and emails it for an unknown email", async () => {
    const { workspace, admin } = await setup();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const invitedEmail = uniqueEmail("inv-new");
    const sendSpy = vi
      .spyOn(emailService, "sendWorkspaceInvitationEmail")
      .mockResolvedValue(undefined);

    const response = await createInvitation(
      inviteRequest(workspace.id, { email: invitedEmail, role: "ADMIN" }),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as {
      status: string;
      email: string;
      role: string;
      expiresAt: string;
    };

    expect(response.status).toBe(201);
    expect(body.status).toBe("invited");
    expect(body.email).toBe(invitedEmail);
    expect(body.role).toBe("ADMIN");
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(
      invitedEmail,
      expect.objectContaining({ workspaceName: workspace.name }),
    );

    const row = await prisma.workspaceInvitation.findFirst({
      where: { workspaceId: workspace.id, email: invitedEmail },
    });
    expect(row).not.toBeNull();
    expect(row?.acceptedAt).toBeNull();
    // Raw token is never stored — only its hash, and the hash never
    // literally equals the (impossible to know here) raw token string;
    // this asserts the stored value is a 64-char hex sha256 digest, not
    // some other identifiable/reversible format.
    expect(row?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const msUntilExpiry = new Date(row!.expiresAt).getTime() - Date.now();
    expect(msUntilExpiry).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(msUntilExpiry).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
  });

  it("invalidates a prior pending invitation instead of leaving two live ones", async () => {
    const { workspace, admin } = await setup();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const invitedEmail = uniqueEmail("inv-reinvite");
    vi.spyOn(emailService, "sendWorkspaceInvitationEmail").mockResolvedValue(undefined);

    await createInvitation(
      inviteRequest(workspace.id, { email: invitedEmail, role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );
    await createInvitation(
      inviteRequest(workspace.id, { email: invitedEmail, role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );

    const rows = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: workspace.id, email: invitedEmail, acceptedAt: null },
    });
    expect(rows).toHaveLength(1);
  });

  it("treats invite emails differing only by case as the same recipient (invalidates the prior one)", async () => {
    const { workspace, admin } = await setup();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const invitedEmail = uniqueEmail("inv-case-reinvite");
    vi.spyOn(emailService, "sendWorkspaceInvitationEmail").mockResolvedValue(undefined);

    await createInvitation(
      inviteRequest(workspace.id, { email: invitedEmail.toUpperCase(), role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );
    await createInvitation(
      inviteRequest(workspace.id, { email: invitedEmail, role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );

    // Both requests must resolve to the exact same normalized row, not
    // two rows that happen to differ only by case.
    const rows = await prisma.workspaceInvitation.findMany({
      where: {
        workspaceId: workspace.id,
        acceptedAt: null,
        email: { contains: invitedEmail },
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe(invitedEmail);
  });

  // Documents the chosen, deterministic behavior for a genuine concurrent
  // race (see workspace-invitation.repository.ts's own comment and
  // schema.prisma's partial unique index): rather than letting both
  // requests succeed with two separate pending rows (not acceptable, per
  // the hardening spec), or making the loser see a hard error, the losing
  // request converges on the winner's already-persisted, already-emailed
  // invitation. Both HTTP responses report success; the database and the
  // mailbox both end up with exactly one live invitation regardless of
  // which request the database happened to serialize first.
  it("never creates more than one pending invitation under concurrent creation requests, and never sends two invitation emails", async () => {
    const { workspace, admin } = await setup();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const invitedEmail = uniqueEmail("inv-race-create");
    const sendSpy = vi
      .spyOn(emailService, "sendWorkspaceInvitationEmail")
      .mockResolvedValue(undefined);

    const [first, second] = await Promise.all([
      createInvitation(
        inviteRequest(workspace.id, { email: invitedEmail, role: "MEMBER" }),
        workspaceCtx(workspace.id),
      ),
      createInvitation(
        inviteRequest(workspace.id, { email: invitedEmail, role: "MEMBER" }),
        workspaceCtx(workspace.id),
      ),
    ]);
    const firstBody = (await first.json()) as { status: string; expiresAt: string };
    const secondBody = (await second.json()) as { status: string; expiresAt: string };

    // Deterministic and acceptable per the hardening spec: both responses
    // report the same outcome (the same underlying invitation), not one
    // success + one hard error and not two independently-valid invites.
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(firstBody.status).toBe("invited");
    expect(secondBody.status).toBe("invited");
    expect(firstBody.expiresAt).toBe(secondBody.expiresAt);

    const rows = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: workspace.id, email: invitedEmail, acceptedAt: null },
    });
    expect(rows).toHaveLength(1);
    // Not acceptable per the hardening spec: two invitation emails for
    // two different (tokenHash) invitations. Exactly one send happened —
    // the losing request never emails a token that was never persisted.
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("rolls back the invitation and returns 502 when delivery fails", async () => {
    const { workspace, admin } = await setup();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const invitedEmail = uniqueEmail("inv-fail");
    vi.spyOn(emailService, "sendWorkspaceInvitationEmail").mockRejectedValueOnce(
      new Error("Resend request failed: validation_error (status 422)"),
    );

    const response = await createInvitation(
      inviteRequest(workspace.id, { email: invitedEmail, role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(502);
    expect(response.status).not.toBe(500);
    expect(body.error).toBe("email_delivery_failed");
    expect(JSON.stringify(body)).not.toContain("Resend request failed");

    const rows = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: workspace.id, email: invitedEmail },
    });
    expect(rows).toHaveLength(0);
  });

  // --- Acceptance: token security + binding ------------------------------

  async function inviteAndGetToken(workspaceId: string, adminId: string, email: string) {
    mockedAuth.mockResolvedValue(sessionFor(adminId));
    let capturedUrl = "";
    vi.spyOn(emailService, "sendWorkspaceInvitationEmail").mockImplementation(
      async (_to, details) => {
        capturedUrl = details.acceptUrl;
      },
    );
    await createInvitation(
      inviteRequest(workspaceId, { email, role: "MEMBER" }),
      workspaceCtx(workspaceId),
    );
    const token = new URL(capturedUrl).searchParams.get("token");
    if (!token) throw new Error("test setup failed: no token captured");
    return token;
  }

  it("rejects an invalid token", async () => {
    const { owner } = await setup();
    mockedAuth.mockResolvedValue(sessionFor(owner.id));

    const response = await acceptInvitation(acceptRequest("not-a-real-token"));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_token");
  });

  it("rejects an expired invitation", async () => {
    const { workspace, admin } = await setup();
    const invitedEmail = uniqueEmail("inv-expired");
    emails.push(invitedEmail);

    // Invite while the email is still unregistered (otherwise the route
    // takes the "existing account" branch and never creates an
    // invitation at all), then register the invited address afterward —
    // simulating "they signed up in response to the email."
    const token = await inviteAndGetToken(workspace.id, admin.id, invitedEmail);
    const target = await prisma.user.create({
      data: { email: invitedEmail, name: "Expired Target", passwordHash: "x" },
    });
    await prisma.workspaceInvitation.updateMany({
      where: { workspaceId: workspace.id, email: invitedEmail },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    mockedAuth.mockResolvedValue(sessionWithEmail(target.id, invitedEmail));
    const response = await acceptInvitation(acceptRequest(token));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invitation_expired");
  });

  it("rejects reuse of an already-accepted invitation", async () => {
    const { workspace, admin } = await setup();
    const invitedEmail = uniqueEmail("inv-reuse");
    emails.push(invitedEmail);

    const token = await inviteAndGetToken(workspace.id, admin.id, invitedEmail);
    const target = await prisma.user.create({
      data: { email: invitedEmail, name: "Reuse Target", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionWithEmail(target.id, invitedEmail));

    const first = await acceptInvitation(acceptRequest(token));
    expect(first.status).toBe(200);

    const second = await acceptInvitation(acceptRequest(token));
    const secondBody = (await second.json()) as { error: string };
    expect(second.status).toBe(400);
    expect(secondBody.error).toBe("invitation_used");
  });

  it("rejects acceptance by a signed-in account whose email doesn't match the invitation (token/account binding)", async () => {
    const { workspace, admin } = await setup();
    const invitedEmail = uniqueEmail("inv-real-target");
    const attacker = await createUser("inv-attacker");
    emails.push(invitedEmail, attacker.email);

    const token = await inviteAndGetToken(workspace.id, admin.id, invitedEmail);
    // The attacker is a real, distinct, already-authenticated account —
    // not the invited address — attempting to use a token they obtained
    // some other way (e.g. a forwarded email).
    mockedAuth.mockResolvedValue(sessionFor(attacker.id));

    const response = await acceptInvitation(acceptRequest(token));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("email_mismatch");

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: attacker.id } },
    });
    expect(membership).toBeNull();
  });

  it("only grants membership in the invitation's own workspace, never another", async () => {
    const { workspace: workspaceA, admin } = await setup();
    const owner = await createUser("inv-ownerB");
    emails.push(owner.email);
    const workspaceB = await createWorkspace(owner.id, "Other Workspace");
    workspaceIds.push(workspaceB.id);

    const invitedEmail = uniqueEmail("inv-cross-ws");
    emails.push(invitedEmail);

    const token = await inviteAndGetToken(workspaceA.id, admin.id, invitedEmail);
    const target = await prisma.user.create({
      data: { email: invitedEmail, name: "Cross WS Target", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionWithEmail(target.id, invitedEmail));

    const response = await acceptInvitation(acceptRequest(token));
    const body = (await response.json()) as { workspace: { id: string } };

    expect(response.status).toBe(200);
    expect(body.workspace.id).toBe(workspaceA.id);

    const membershipA = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspaceA.id, userId: target.id } },
    });
    const membershipB = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspaceB.id, userId: target.id } },
    });
    expect(membershipA).not.toBeNull();
    expect(membershipB).toBeNull();
  });

  it("accepts a valid invitation and creates membership with the invited role", async () => {
    const { workspace, admin } = await setup();
    const invitedEmail = uniqueEmail("inv-accept-ok");
    emails.push(invitedEmail);

    const token = await inviteAndGetToken(workspace.id, admin.id, invitedEmail);
    const target = await prisma.user.create({
      data: { email: invitedEmail, name: "Accept OK", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionWithEmail(target.id, invitedEmail));

    const response = await acceptInvitation(acceptRequest(token));
    const body = (await response.json()) as { workspace: { slug: string } };

    expect(response.status).toBe(200);
    expect(body.workspace.slug).toBe(workspace.slug);
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: target.id } },
    });
    expect(membership?.role).toBe("MEMBER");
    const row = await prisma.workspaceInvitation.findFirst({
      where: { workspaceId: workspace.id, email: invitedEmail },
    });
    expect(row?.acceptedAt).not.toBeNull();
  });

  it("accepts an invitation when the invite and the registered account differ only by email case", async () => {
    const { workspace, admin } = await setup();
    // Admin invites lowercase; the recipient's real account ends up mixed
    // case (exactly the "invite lowercase, register mixed case" scenario
    // from the hardening spec).
    const invitedEmail = uniqueEmail("inv-case-accept");
    emails.push(invitedEmail);

    const token = await inviteAndGetToken(workspace.id, admin.id, invitedEmail);
    // A true case variant of the exact same address (not a different
    // local part) — e.g. "foo@x.com" invited, "FOO@X.COM" registered.
    const registeredEmail = invitedEmail.toUpperCase();
    emails.push(registeredEmail);
    const target = await prisma.user.create({
      data: { email: registeredEmail, name: "Case Mismatch OK", passwordHash: "x" },
    });
    // The account's own stored email — mixed case, exactly as they typed
    // it at signup — is what a real session would carry.
    mockedAuth.mockResolvedValue(sessionWithEmail(target.id, registeredEmail));

    const response = await acceptInvitation(acceptRequest(token));

    expect(response.status).toBe(200);
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: target.id } },
    });
    expect(membership).not.toBeNull();
  });

  it("allows a fresh invitation for the same email after a prior one was accepted", async () => {
    const { workspace, admin } = await setup();
    const invitedEmail = uniqueEmail("inv-reinvite-accepted");
    emails.push(invitedEmail);

    const firstToken = await inviteAndGetToken(workspace.id, admin.id, invitedEmail);
    const target = await prisma.user.create({
      data: { email: invitedEmail, name: "Reinvite After Accept", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionWithEmail(target.id, invitedEmail));
    const acceptResponse = await acceptInvitation(acceptRequest(firstToken));
    expect(acceptResponse.status).toBe(200);

    // The accepted row must NOT block a brand-new invitation later (e.g.
    // the workspace removed them and wants to re-invite) — the partial
    // unique index only constrains acceptedAt IS NULL rows.
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const secondInvite = await createInvitation(
      inviteRequest(workspace.id, { email: invitedEmail, role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );

    // The target is already a member (from the first acceptance), so this
    // now correctly takes the "existing account" branch rather than
    // creating a second invitation — either way, it must not fail because
    // of the accepted row.
    expect([201, 409]).toContain(secondInvite.status);
  });

  it("allows a fresh invitation for the same email after a prior one expired", async () => {
    const { workspace, admin } = await setup();
    const invitedEmail = uniqueEmail("inv-reinvite-expired");
    emails.push(invitedEmail);

    await inviteAndGetToken(workspace.id, admin.id, invitedEmail);
    await prisma.workspaceInvitation.updateMany({
      where: { workspaceId: workspace.id, email: invitedEmail },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    // vi.spyOn on an already-spied method (inviteAndGetToken spied it
    // first) reuses the same spy instance — clear its call history so
    // this assertion only reflects the second (fresh) invite, not the
    // first (now-expired) one.
    const sendSpy = vi
      .spyOn(emailService, "sendWorkspaceInvitationEmail")
      .mockResolvedValue(undefined);
    sendSpy.mockClear();
    const response = await createInvitation(
      inviteRequest(workspace.id, { email: invitedEmail, role: "MEMBER" }),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(201);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const rows = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: workspace.id, email: invitedEmail, acceptedAt: null },
    });
    // The expired row was invalidated (deleted) before the fresh one was
    // created — exactly one live row remains, and it's not expired.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("handles an already-existing membership at accept time without erroring or duplicating", async () => {
    const { workspace, admin } = await setup();
    const invitedEmail = uniqueEmail("inv-already-member");
    emails.push(invitedEmail);

    const token = await inviteAndGetToken(workspace.id, admin.id, invitedEmail);
    const target = await prisma.user.create({
      data: { email: invitedEmail, name: "Already Member", passwordHash: "x" },
    });
    // Simulate the target having been added directly (e.g. by another
    // admin) in the window between invite and accept.
    await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: target.id, role: "MEMBER" },
    });

    mockedAuth.mockResolvedValue(sessionWithEmail(target.id, invitedEmail));
    const response = await acceptInvitation(acceptRequest(token));

    expect(response.status).toBe(200);
    const memberships = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id, userId: target.id },
    });
    expect(memberships).toHaveLength(1);
  });

  it("only lets one of two concurrent accept attempts for the same token succeed", async () => {
    const { workspace, admin } = await setup();
    const invitedEmail = uniqueEmail("inv-race");
    emails.push(invitedEmail);

    const token = await inviteAndGetToken(workspace.id, admin.id, invitedEmail);
    const target = await prisma.user.create({
      data: { email: invitedEmail, name: "Race Target", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue(sessionWithEmail(target.id, invitedEmail));

    const [first, second] = await Promise.all([
      acceptInvitation(acceptRequest(token)),
      acceptInvitation(acceptRequest(token)),
    ]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([200, 400]);
    const memberships = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id, userId: target.id },
    });
    expect(memberships).toHaveLength(1);
  });
});
