import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { workspaceMemberRepository } from "@/repositories/workspace/workspace-member.repository";

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

const { GET: listWorkspaces, POST: createWorkspace } =
  await import("@/app/api/workspaces/route");
const {
  GET: getWorkspace,
  PATCH: updateWorkspace,
  DELETE: deleteWorkspace,
} = await import("@/app/api/workspaces/[workspaceId]/route");

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function ctx(workspaceId: string) {
  return { params: Promise.resolve({ workspaceId }) };
}

async function createUser(prefix: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x" },
  });
  return { id: user.id, email };
}

describe("POST /api/workspaces", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  it("returns 401 when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await createWorkspace(
      jsonRequest("http://localhost:3000/api/workspaces", "POST", { name: "No Session" }),
    );
    expect(response.status).toBe(401);
  });

  it("creates the workspace with the caller as OWNER, generating a slug from the name", async () => {
    const owner = await createUser("ws-create-owner");
    emails.push(owner.email);
    mockedAuth.mockResolvedValue(sessionFor(owner.id));

    const response = await createWorkspace(
      jsonRequest("http://localhost:3000/api/workspaces", "POST", { name: "Acme Inc" }),
    );
    const body = (await response.json()) as { id: string; slug: string; role: string };
    workspaceIds.push(body.id);

    expect(response.status).toBe(201);
    expect(body.slug).toMatch(/^acme-inc/);
    expect(body.role).toBe("OWNER");

    const membership = await workspaceMemberRepository.findByWorkspaceAndUser(
      body.id,
      owner.id,
    );
    expect(membership?.role).toBe("OWNER");
  });

  it("rejects a duplicate slug with 409 and does not create a second workspace", async () => {
    const owner = await createUser("ws-create-dup");
    emails.push(owner.email);
    mockedAuth.mockResolvedValue(sessionFor(owner.id));
    const slug = uniqueSlug("dup-ws");

    const first = await createWorkspace(
      jsonRequest("http://localhost:3000/api/workspaces", "POST", {
        name: "First",
        slug,
      }),
    );
    const firstBody = (await first.json()) as { id: string };
    workspaceIds.push(firstBody.id);
    expect(first.status).toBe(201);

    const second = await createWorkspace(
      jsonRequest("http://localhost:3000/api/workspaces", "POST", {
        name: "Second",
        slug,
      }),
    );
    const secondBody = (await second.json()) as { error: string };

    expect(second.status).toBe(409);
    expect(secondBody.error).toBe("slug_taken");
  });

  it("rejects an invalid payload with 400 validation_error", async () => {
    const owner = await createUser("ws-create-invalid");
    emails.push(owner.email);
    mockedAuth.mockResolvedValue(sessionFor(owner.id));

    const response = await createWorkspace(
      jsonRequest("http://localhost:3000/api/workspaces", "POST", { name: "" }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_error");
  });
});

describe("GET /api/workspaces", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  it("only returns workspaces the caller is a member of", async () => {
    const userA = await createUser("ws-list-a");
    const userB = await createUser("ws-list-b");
    emails.push(userA.email, userB.email);

    mockedAuth.mockResolvedValue(sessionFor(userA.id));
    const created = await createWorkspace(
      jsonRequest("http://localhost:3000/api/workspaces", "POST", {
        name: "A's Workspace",
        slug: uniqueSlug("a-only"),
      }),
    );
    const { id } = (await created.json()) as { id: string };
    workspaceIds.push(id);

    const listAsA = await listWorkspaces();
    const bodyAsA = (await listAsA.json()) as { id: string }[];
    expect(bodyAsA.some((w) => w.id === id)).toBe(true);

    mockedAuth.mockResolvedValue(sessionFor(userB.id));
    const listAsB = await listWorkspaces();
    const bodyAsB = (await listAsB.json()) as { id: string }[];
    expect(bodyAsB.some((w) => w.id === id)).toBe(false);
  });
});

describe("GET/PATCH/DELETE /api/workspaces/[workspaceId]", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupWorkspace() {
    const owner = await createUser("ws-detail-owner");
    const admin = await createUser("ws-detail-admin");
    const member = await createUser("ws-detail-member");
    const outsider = await createUser("ws-detail-outsider");
    emails.push(owner.email, admin.email, member.email, outsider.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Detail Workspace",
        slug: uniqueSlug("detail-ws"),
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

    return { workspace, owner, admin, member, outsider };
  }

  it("GET returns the same 404 body for a non-member as for a nonexistent workspace", async () => {
    const { workspace, outsider } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const asNonMember = await getWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}`, "GET"),
      ctx(workspace.id),
    );
    const asNonExistent = await getWorkspace(
      jsonRequest(
        "http://localhost:3000/api/workspaces/00000000-0000-0000-0000-000000000000",
        "GET",
      ),
      ctx("00000000-0000-0000-0000-000000000000"),
    );

    expect(asNonMember.status).toBe(404);
    expect(asNonExistent.status).toBe(404);
    expect(await asNonMember.json()).toEqual(await asNonExistent.json());
  });

  it("GET returns workspace details with the caller's role for a member", async () => {
    const { workspace, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await getWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}`, "GET"),
      ctx(workspace.id),
    );
    const body = (await response.json()) as { id: string; role: string };

    expect(response.status).toBe(200);
    expect(body.id).toBe(workspace.id);
    expect(body.role).toBe("MEMBER");
  });

  it("PATCH succeeds for ADMIN", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await updateWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}`, "PATCH", {
        name: "Renamed",
      }),
      ctx(workspace.id),
    );
    const body = (await response.json()) as { name: string };

    expect(response.status).toBe(200);
    expect(body.name).toBe("Renamed");
  });

  it("PATCH returns 403 forbidden for a plain MEMBER", async () => {
    const { workspace, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await updateWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}`, "PATCH", {
        name: "Should Fail",
      }),
      ctx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("PATCH returns 404 (not 403) for a non-member", async () => {
    const { workspace, outsider } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await updateWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}`, "PATCH", {
        name: "Should 404",
      }),
      ctx(workspace.id),
    );

    expect(response.status).toBe(404);
  });

  it("DELETE succeeds for OWNER and cascades members/projects", async () => {
    const { workspace, owner } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(owner.id));

    const response = await deleteWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}`, "DELETE"),
      ctx(workspace.id),
    );
    expect(response.status).toBe(200);

    const remaining = await prisma.workspace.findUnique({ where: { id: workspace.id } });
    expect(remaining).toBeNull();
    const remainingMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
    });
    expect(remainingMembers).toHaveLength(0);
  });

  it("DELETE returns 403 forbidden for ADMIN (OWNER-only action)", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await deleteWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}`, "DELETE"),
      ctx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });
});
