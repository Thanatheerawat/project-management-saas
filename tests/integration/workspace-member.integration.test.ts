import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  deleteTestUser,
  deleteTestWorkspace,
  sessionFor,
  uniqueEmail,
  uniqueSlug,
} from "./helpers";

vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

const { GET: listMembers, POST: addMember } =
  await import("@/app/api/workspaces/[workspaceId]/members/route");
const { PATCH: updateMemberRole, DELETE: removeMember } =
  await import("@/app/api/workspaces/[workspaceId]/members/[memberId]/route");

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function memberCtx(workspaceId: string, memberId: string) {
  return { params: Promise.resolve({ workspaceId, memberId }) };
}

function workspaceCtx(workspaceId: string) {
  return { params: Promise.resolve({ workspaceId }) };
}

async function createUser(prefix: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x" },
  });
  return { id: user.id, email };
}

describe("Workspace member management", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupWorkspace() {
    const owner = await createUser("mem-owner");
    const admin = await createUser("mem-admin");
    const member = await createUser("mem-member");
    const outsider = await createUser("mem-outsider");
    const target = await createUser("mem-target");
    emails.push(owner.email, admin.email, member.email, outsider.email, target.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Member Workspace",
        slug: uniqueSlug("member-ws"),
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: admin.id, role: "ADMIN" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    workspaceIds.push(workspace.id);

    const ownerMembership = await prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: owner.id } },
    });
    const memberMembership = await prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: member.id } },
    });

    return {
      workspace,
      owner,
      admin,
      member,
      outsider,
      target,
      ownerMembership,
      memberMembership,
    };
  }

  it("GET lists members with their roles for a workspace member", async () => {
    const { workspace, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await listMembers(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/members`, "GET"),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { role: string }[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(3);
    expect(body.some((m) => m.role === "OWNER")).toBe(true);
  });

  it("GET returns 404 for a non-member", async () => {
    const { workspace, outsider } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await listMembers(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/members`, "GET"),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(404);
  });

  it("POST adds a member by email when the actor is ADMIN+", async () => {
    const { workspace, admin, target } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await addMember(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members`,
        "POST",
        {
          email: target.email,
          role: "MEMBER",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { role: string; user: { email: string } };

    expect(response.status).toBe(201);
    expect(body.role).toBe("MEMBER");
    expect(body.user.email).toBe(target.email);
  });

  it("POST returns 403 forbidden when the actor is a plain MEMBER", async () => {
    const { workspace, member, target } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await addMember(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members`,
        "POST",
        {
          email: target.email,
          role: "MEMBER",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("POST returns 404 not_found for an email with no account", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await addMember(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members`,
        "POST",
        {
          email: uniqueEmail("mem-no-account"),
          role: "MEMBER",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  it("POST returns 409 already_member for an existing member", async () => {
    const { workspace, admin, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await addMember(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members`,
        "POST",
        {
          email: member.email,
          role: "MEMBER",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("already_member");
  });

  it("PATCH changes a MEMBER's role to ADMIN when the actor is ADMIN+", async () => {
    const { workspace, admin, member, memberMembership } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await updateMemberRole(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members/${memberMembership.id}`,
        "PATCH",
        { role: "ADMIN" },
      ),
      memberCtx(workspace.id, memberMembership.id),
    );
    const body = (await response.json()) as { role: string };

    expect(response.status).toBe(200);
    expect(body.role).toBe("ADMIN");

    const updated = await prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: member.id } },
    });
    expect(updated.role).toBe("ADMIN");
  });

  it("PATCH refuses to change the OWNER's role, regardless of actor", async () => {
    const { workspace, admin, ownerMembership } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await updateMemberRole(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members/${ownerMembership.id}`,
        "PATCH",
        { role: "MEMBER" },
      ),
      memberCtx(workspace.id, ownerMembership.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("owner_role_immutable");
  });

  it("PATCH returns 403 forbidden when the actor is a plain MEMBER", async () => {
    const { workspace, member, memberMembership } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await updateMemberRole(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members/${memberMembership.id}`,
        "PATCH",
        { role: "ADMIN" },
      ),
      memberCtx(workspace.id, memberMembership.id),
    );

    expect(response.status).toBe(403);
  });

  it("PATCH cross-workspace tampering guard: 404 when memberId belongs to a different workspace", async () => {
    const { workspace: workspaceA, admin: adminA } = await setupWorkspace();
    const { workspace: workspaceB, memberMembership: memberInB } = await setupWorkspace();

    mockedAuth.mockResolvedValue(sessionFor(adminA.id));

    // adminA is ADMIN+ in workspaceA, but the memberId in the URL belongs to
    // workspaceB — must 404, not silently act across workspaces.
    const response = await updateMemberRole(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspaceA.id}/members/${memberInB.id}`,
        "PATCH",
        { role: "ADMIN" },
      ),
      memberCtx(workspaceA.id, memberInB.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");

    const untouched = await prisma.workspaceMember.findUniqueOrThrow({
      where: { id: memberInB.id },
    });
    expect(untouched.workspaceId).toBe(workspaceB.id);
    expect(untouched.role).toBe("MEMBER");
  });

  it("DELETE allows a MEMBER to remove themselves (self-leave)", async () => {
    const { workspace, member, memberMembership } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await removeMember(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members/${memberMembership.id}`,
        "DELETE",
      ),
      memberCtx(workspace.id, memberMembership.id),
    );
    expect(response.status).toBe(200);

    const remaining = await prisma.workspaceMember.findUnique({
      where: { id: memberMembership.id },
    });
    expect(remaining).toBeNull();
  });

  it("DELETE forbids a plain MEMBER from removing someone else", async () => {
    const { workspace, member, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const adminMembership = await prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: admin.id } },
    });

    const response = await removeMember(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members/${adminMembership.id}`,
        "DELETE",
      ),
      memberCtx(workspace.id, adminMembership.id),
    );

    expect(response.status).toBe(403);
  });

  it("DELETE refuses to remove the OWNER, regardless of actor", async () => {
    const { workspace, owner, ownerMembership } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(owner.id));

    const response = await removeMember(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/members/${ownerMembership.id}`,
        "DELETE",
      ),
      memberCtx(workspace.id, ownerMembership.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("owner_immutable");
  });
});
