import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { issueRepository } from "@/repositories/issue/issue.repository";

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

const { POST: createProject } =
  await import("@/app/api/workspaces/[workspaceId]/projects/route");
const { GET: listIssues, POST: createIssue } =
  await import("@/app/api/projects/[projectId]/issues/route");
const {
  GET: getIssue,
  PATCH: updateIssue,
  DELETE: deleteIssue,
} = await import("@/app/api/issues/[issueId]/route");

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

function issueCtx(issueId: string) {
  return { params: Promise.resolve({ issueId }) };
}

async function createUser(prefix: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x" },
  });
  return { id: user.id, email };
}

describe("Issue CRUD", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupProject() {
    const owner = await createUser("issue-owner");
    const admin = await createUser("issue-admin");
    const member = await createUser("issue-member");
    const outsider = await createUser("issue-outsider");
    emails.push(owner.email, admin.email, member.email, outsider.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Issue Workspace",
        slug: uniqueSlug("issue-ws"),
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

    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const projectResponse = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        { name: "Issue Project" },
      ),
      workspaceCtx(workspace.id),
    );
    const project = (await projectResponse.json()) as { id: string; key: string };

    return { workspace, project, owner, admin, member, outsider };
  }

  it("POST creates an issue in BACKLOG with a computed key, when actor is a plain MEMBER (Decision Point G)", async () => {
    const { project, member } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Fix login bug",
        priority: "HIGH",
      }),
      projectCtx(project.id),
    );
    const body = (await response.json()) as {
      key: string;
      status: string;
      priority: string;
      number: number;
    };

    expect(response.status).toBe(201);
    expect(body.status).toBe("BACKLOG");
    expect(body.priority).toBe("HIGH");
    expect(body.key).toBe(`${project.key}-${body.number}`);
  });

  it("POST returns 404 for a non-member of the project's workspace", async () => {
    const { project, outsider } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Should 404",
      }),
      projectCtx(project.id),
    );

    expect(response.status).toBe(404);
  });

  it("POST rejects an assignee who is not a workspace member with 400 invalid_assignee", async () => {
    const { project, member, outsider } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Bad assignee",
        assigneeId: outsider.id,
      }),
      projectCtx(project.id),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_assignee");
  });

  it("POST accepts a real workspace member as assignee", async () => {
    const { project, member, admin } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Good assignee",
        assigneeId: admin.id,
      }),
      projectCtx(project.id),
    );
    const body = (await response.json()) as { assigneeId: string };

    expect(response.status).toBe(201);
    expect(body.assigneeId).toBe(admin.id);
  });

  it("GET list returns 404 for a non-member", async () => {
    const { project, outsider } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await listIssues(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "GET"),
      projectCtx(project.id),
    );

    expect(response.status).toBe(404);
  });

  it("GET list includes every issue in the project with labels embedded", async () => {
    const { project, member } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Listed issue",
      }),
      projectCtx(project.id),
    );

    const response = await listIssues(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "GET"),
      projectCtx(project.id),
    );
    const body = (await response.json()) as { title: string; labels: unknown[] }[];

    expect(response.status).toBe(200);
    const created = body.find((i) => i.title === "Listed issue");
    expect(created?.labels).toEqual([]);
  });

  it("GET detail returns the same 404 body for a non-member as for a nonexistent issue", async () => {
    const { project, member, outsider } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const created = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Enum safe",
      }),
      projectCtx(project.id),
    );
    const { id: issueId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(outsider.id));
    const asNonMember = await getIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueId}`, "GET"),
      issueCtx(issueId),
    );
    const asNonExistent = await getIssue(
      jsonRequest(
        "http://localhost:3000/api/issues/00000000-0000-0000-0000-000000000000",
        "GET",
      ),
      issueCtx("00000000-0000-0000-0000-000000000000"),
    );

    expect(asNonMember.status).toBe(404);
    expect(asNonExistent.status).toBe(404);
    expect(await asNonMember.json()).toEqual(await asNonExistent.json());
  });

  it("PATCH allows a plain MEMBER who is neither reporter nor assignee to edit (Decision Point G)", async () => {
    const { project, admin, member } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Reported by admin",
      }),
      projectCtx(project.id),
    );
    const { id: issueId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await updateIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueId}`, "PATCH", {
        title: "Edited by member",
      }),
      issueCtx(issueId),
    );
    const body = (await response.json()) as { title: string };

    expect(response.status).toBe(200);
    expect(body.title).toBe("Edited by member");
  });

  it("PATCH omitting assigneeId leaves the existing assignee untouched", async () => {
    const { project, admin, member } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Has assignee",
        assigneeId: member.id,
      }),
      projectCtx(project.id),
    );
    const { id: issueId } = (await created.json()) as { id: string };

    const response = await updateIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueId}`, "PATCH", {
        priority: "LOW",
      }),
      issueCtx(issueId),
    );
    const body = (await response.json()) as {
      assigneeId: string | null;
      priority: string;
    };

    expect(response.status).toBe(200);
    expect(body.priority).toBe("LOW");
    expect(body.assigneeId).toBe(member.id);
  });

  it("PATCH with assigneeId: null explicitly unassigns", async () => {
    const { project, admin, member } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Will be unassigned",
        assigneeId: member.id,
      }),
      projectCtx(project.id),
    );
    const { id: issueId } = (await created.json()) as { id: string };

    const response = await updateIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueId}`, "PATCH", {
        assigneeId: null,
      }),
      issueCtx(issueId),
    );
    const body = (await response.json()) as { assigneeId: string | null };

    expect(response.status).toBe(200);
    expect(body.assigneeId).toBeNull();
  });

  it("PATCH rejects reassignment to a non-member with 400 invalid_assignee and does not change the assignee", async () => {
    const { project, admin, member, outsider } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Guarded reassignment",
        assigneeId: member.id,
      }),
      projectCtx(project.id),
    );
    const { id: issueId } = (await created.json()) as { id: string };

    const response = await updateIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueId}`, "PATCH", {
        assigneeId: outsider.id,
      }),
      issueCtx(issueId),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_assignee");

    const untouched = await prisma.issue.findUniqueOrThrow({ where: { id: issueId } });
    expect(untouched.assigneeId).toBe(member.id);
  });

  it("PATCH returns 404 for a non-member", async () => {
    const { project, admin, outsider } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Not yours",
      }),
      projectCtx(project.id),
    );
    const { id: issueId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(outsider.id));
    const response = await updateIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueId}`, "PATCH", {
        title: "Should 404",
      }),
      issueCtx(issueId),
    );

    expect(response.status).toBe(404);
  });

  it("DELETE returns 403 forbidden for a plain MEMBER (ADMIN+ only, Decision Point G)", async () => {
    const { project, admin, member } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Member cannot delete",
      }),
      projectCtx(project.id),
    );
    const { id: issueId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await deleteIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueId}`, "DELETE"),
      issueCtx(issueId),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("DELETE succeeds for ADMIN+ and returns 404 afterward", async () => {
    const { project, admin } = await setupProject();
    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const created = await createIssue(
      jsonRequest(`http://localhost:3000/api/projects/${project.id}/issues`, "POST", {
        title: "Deletable",
      }),
      projectCtx(project.id),
    );
    const { id: issueId } = (await created.json()) as { id: string };

    const response = await deleteIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueId}`, "DELETE"),
      issueCtx(issueId),
    );
    expect(response.status).toBe(200);

    const after = await getIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueId}`, "GET"),
      issueCtx(issueId),
    );
    expect(after.status).toBe(404);
  });
});

// Dedicated repository-level suite: verifies the atomicity guarantee
// documented on Project.issueCounter in schema.prisma — concurrent creates
// must never hand out the same Issue.number twice. Calls issueRepository
// directly (bypassing the HTTP route) so the assertion isolates exactly
// this guarantee, not the route's separate (and already-accepted,
// non-unique) position computation.
describe("Concurrent issue creation (atomic numbering)", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  it("assigns every concurrently created issue a unique, gap-free number", async () => {
    const owner = await createUser("issue-concurrency-owner");
    emails.push(owner.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Concurrency Workspace",
        slug: uniqueSlug("issue-concurrency-ws"),
        members: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
    workspaceIds.push(workspace.id);

    mockedAuth.mockResolvedValue(sessionFor(owner.id));
    const projectResponse = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        { name: "Concurrency Project" },
      ),
      workspaceCtx(workspace.id),
    );
    const project = (await projectResponse.json()) as { id: string };

    const CONCURRENT_CREATES = 10;
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_CREATES }, (_, i) =>
        issueRepository.create({
          projectId: project.id,
          title: `Concurrent issue ${i}`,
          position: 1000 * (i + 1),
          reporterId: owner.id,
        }),
      ),
    );

    const numbers = results.map((issue) => issue.number);
    expect(new Set(numbers).size).toBe(CONCURRENT_CREATES);
    expect([...numbers].sort((a, b) => a - b)).toEqual(
      Array.from({ length: CONCURRENT_CREATES }, (_, i) => i + 1),
    );

    const finalProject = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(finalProject.issueCounter).toBe(CONCURRENT_CREATES);
  });
});
