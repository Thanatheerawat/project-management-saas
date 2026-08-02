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

const { GET: listProjects, POST: createProject } =
  await import("@/app/api/workspaces/[workspaceId]/projects/route");
const {
  GET: getProject,
  PATCH: updateProject,
  DELETE: deleteProject,
} = await import("@/app/api/projects/[projectId]/route");

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function workspaceCtx(workspaceId: string) {
  return { params: Promise.resolve({ workspaceId }) };
}

function projectCtx(projectId: string) {
  return { params: Promise.resolve({ projectId }) };
}

async function createUser(prefix: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x" },
  });
  return { id: user.id, email };
}

describe("Project CRUD", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupWorkspace() {
    const owner = await createUser("proj-owner");
    const admin = await createUser("proj-admin");
    const member = await createUser("proj-member");
    const outsider = await createUser("proj-outsider");
    emails.push(owner.email, admin.email, member.email, outsider.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Project Workspace",
        slug: uniqueSlug("project-ws"),
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

  it("POST creates a project with the caller as owner and ACTIVE status, when actor is ADMIN+", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Design System",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { status: string; ownerId: string };

    expect(response.status).toBe(201);
    expect(body.status).toBe("ACTIVE");
    expect(body.ownerId).toBe(admin.id);
  });

  it("POST returns 403 forbidden when actor is a plain MEMBER (Decision Point 2)", async () => {
    const { workspace, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Should Fail",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("POST rejects a duplicate project name within the same workspace with 409", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const first = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Dup Project",
        },
      ),
      workspaceCtx(workspace.id),
    );
    expect(first.status).toBe(201);

    const second = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Dup Project",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await second.json()) as { error: string };

    expect(second.status).toBe(409);
    expect(body.error).toBe("name_taken");
  });

  it("POST derives the issue key prefix from the project name (Milestone 4 Increment 1)", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const response = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Design System",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { key: string };

    expect(response.status).toBe(201);
    expect(body.key).toBe("DS");
  });

  it("POST rejects a project whose derived key collides with an existing one, with 409 key_taken", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));

    const first = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Design System",
        },
      ),
      workspaceCtx(workspace.id),
    );
    expect(first.status).toBe(201);

    // "Data Store" derives to the same "DS" prefix as "Design System" —
    // key uniqueness is scoped to the workspace, not the exact name
    // (Decision Point B).
    const second = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Data Store",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const body = (await second.json()) as { error: string };

    expect(second.status).toBe(409);
    expect(body.error).toBe("key_taken");

    const projectsWithKeyDS = await prisma.project.findMany({
      where: { workspaceId: workspace.id, key: "DS" },
    });
    expect(projectsWithKeyDS).toHaveLength(1);
  });

  it("GET list is visible to a plain MEMBER (Decision Point 1: workspace-wide visibility)", async () => {
    const { workspace, admin, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Visible To Members",
        },
      ),
      workspaceCtx(workspace.id),
    );

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await listProjects(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/projects`, "GET"),
      workspaceCtx(workspace.id),
    );
    const body = (await response.json()) as { name: string }[];

    expect(response.status).toBe(200);
    expect(body.some((p) => p.name === "Visible To Members")).toBe(true);
  });

  it("GET list returns 404 for a non-member", async () => {
    const { workspace, outsider } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await listProjects(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspace.id}/projects`, "GET"),
      workspaceCtx(workspace.id),
    );

    expect(response.status).toBe(404);
  });

  it("GET single project returns the same 404 body for a non-member as for a nonexistent project", async () => {
    const { workspace, admin, outsider } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Enum Safe",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const { id: projectId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(outsider.id));
    const asNonMember = await getProject(
      jsonRequest(`http://localhost:3000/api/projects/${projectId}`, "GET"),
      projectCtx(projectId),
    );
    const asNonExistent = await getProject(
      jsonRequest(
        "http://localhost:3000/api/projects/00000000-0000-0000-0000-000000000000",
        "GET",
      ),
      projectCtx("00000000-0000-0000-0000-000000000000"),
    );

    expect(asNonMember.status).toBe(404);
    expect(asNonExistent.status).toBe(404);
    expect(await asNonMember.json()).toEqual(await asNonExistent.json());
  });

  it("PATCH updates name/description/status when actor is ADMIN+", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Editable",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const { id: projectId } = (await created.json()) as { id: string };

    const response = await updateProject(
      jsonRequest(`http://localhost:3000/api/projects/${projectId}`, "PATCH", {
        status: "ON_HOLD",
      }),
      projectCtx(projectId),
    );
    const body = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ON_HOLD");
  });

  it("PATCH returns 403 forbidden for a plain MEMBER", async () => {
    const { workspace, admin, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Member Cannot Edit",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const { id: projectId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await updateProject(
      jsonRequest(`http://localhost:3000/api/projects/${projectId}`, "PATCH", {
        name: "Nope",
      }),
      projectCtx(projectId),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("DELETE succeeds for ADMIN+ and returns 404 afterward", async () => {
    const { workspace, admin } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Deletable",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const { id: projectId } = (await created.json()) as { id: string };

    const response = await deleteProject(
      jsonRequest(`http://localhost:3000/api/projects/${projectId}`, "DELETE"),
      projectCtx(projectId),
    );
    expect(response.status).toBe(200);

    const after = await getProject(
      jsonRequest(`http://localhost:3000/api/projects/${projectId}`, "GET"),
      projectCtx(projectId),
    );
    expect(after.status).toBe(404);
  });

  it("DELETE returns 403 forbidden for a plain MEMBER", async () => {
    const { workspace, admin, member } = await setupWorkspace();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        {
          name: "Member Cannot Delete",
        },
      ),
      workspaceCtx(workspace.id),
    );
    const { id: projectId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await deleteProject(
      jsonRequest(`http://localhost:3000/api/projects/${projectId}`, "DELETE"),
      projectCtx(projectId),
    );

    expect(response.status).toBe(403);
  });
});
