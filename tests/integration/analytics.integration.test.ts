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

const { GET: getWorkspaceOverview } =
  await import("@/app/api/workspaces/[workspaceId]/analytics/overview/route");
const { GET: getWorkspaceWorkload } =
  await import("@/app/api/workspaces/[workspaceId]/analytics/workload/route");
const { GET: getProjectOverview } =
  await import("@/app/api/projects/[projectId]/analytics/overview/route");

function jsonRequest(url: string): Request {
  return new Request(url, { method: "GET" });
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

function uniqueKey(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

type WorkspaceOverviewBody = {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
};

type WorkloadBody = {
  workload: { userId: string | null; name: string; count: number }[];
};

describe("Analytics", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupWorkspaceWithProject() {
    const owner = await createUser("analytics-owner");
    const member = await createUser("analytics-member");
    const outsider = await createUser("analytics-outsider");
    emails.push(owner.email, member.email, outsider.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Analytics Workspace",
        slug: uniqueSlug("analytics-ws"),
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    workspaceIds.push(workspace.id);

    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: "Analytics Project",
        key: uniqueKey(),
        ownerId: owner.id,
      },
    });

    return { workspace, owner, member, outsider, project };
  }

  describe("Workspace overview", () => {
    it("returns exact status/priority counts, total, and zero-fills every remaining enum value", async () => {
      const { workspace, owner, project } = await setupWorkspaceWithProject();

      await issueRepository.create({
        projectId: project.id,
        title: "Urgent backlog issue",
        position: 1000,
        reporterId: owner.id,
        priority: "URGENT",
      });
      const second = await issueRepository.create({
        projectId: project.id,
        title: "Medium issue moved to done",
        position: 2000,
        reporterId: owner.id,
        priority: "MEDIUM",
      });
      await issueRepository.update(second.id, { status: "DONE" });
      // Defaults: BACKLOG status, NONE priority — proves zero-fill covers
      // both directions (statuses/priorities with real data AND the ones
      // this issue itself contributes zero extra count to).
      await issueRepository.create({
        projectId: project.id,
        title: "Untouched default issue",
        position: 3000,
        reporterId: owner.id,
      });

      mockedAuth.mockResolvedValue(sessionFor(owner.id));
      const response = await getWorkspaceOverview(
        jsonRequest(
          `http://localhost:3000/api/workspaces/${workspace.id}/analytics/overview`,
        ),
        workspaceCtx(workspace.id),
      );
      const body = (await response.json()) as WorkspaceOverviewBody;

      expect(response.status).toBe(200);
      expect(body.total).toBe(3);
      expect(body.byStatus).toEqual({
        BACKLOG: 2,
        TODO: 0,
        IN_PROGRESS: 0,
        IN_REVIEW: 0,
        DONE: 1,
        CANCELLED: 0,
      });
      expect(body.byPriority).toEqual({
        URGENT: 1,
        HIGH: 0,
        MEDIUM: 1,
        LOW: 0,
        NONE: 1,
      });
    });

    it("returns all-zero counts (not an error) for a workspace with no issues yet", async () => {
      const { workspace, owner } = await setupWorkspaceWithProject();
      mockedAuth.mockResolvedValue(sessionFor(owner.id));

      const response = await getWorkspaceOverview(
        jsonRequest(
          `http://localhost:3000/api/workspaces/${workspace.id}/analytics/overview`,
        ),
        workspaceCtx(workspace.id),
      );
      const body = (await response.json()) as WorkspaceOverviewBody;

      expect(response.status).toBe(200);
      expect(body.total).toBe(0);
      expect(Object.values(body.byStatus).every((count) => count === 0)).toBe(true);
      expect(Object.values(body.byPriority).every((count) => count === 0)).toBe(true);
    });
  });

  describe("Workspace workload", () => {
    it("includes assigned members, an Unassigned bucket, and members with zero assigned issues", async () => {
      const { workspace, owner, member, project } = await setupWorkspaceWithProject();
      const idleMember = await createUser("analytics-idle-member");
      emails.push(idleMember.email);
      await prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: idleMember.id, role: "MEMBER" },
      });

      await issueRepository.create({
        projectId: project.id,
        title: "Assigned to member",
        position: 1000,
        reporterId: owner.id,
        assigneeId: member.id,
      });
      await issueRepository.create({
        projectId: project.id,
        title: "Left unassigned",
        position: 2000,
        reporterId: owner.id,
      });

      mockedAuth.mockResolvedValue(sessionFor(owner.id));
      const response = await getWorkspaceWorkload(
        jsonRequest(
          `http://localhost:3000/api/workspaces/${workspace.id}/analytics/workload`,
        ),
        workspaceCtx(workspace.id),
      );
      const body = (await response.json()) as WorkloadBody;

      expect(response.status).toBe(200);
      const byUserId = new Map(body.workload.map((entry) => [entry.userId, entry]));

      expect(byUserId.get(member.id)).toEqual({
        userId: member.id,
        name: "analytics-member",
        count: 1,
      });
      // Zero-assigned members must still appear, not be silently dropped.
      expect(byUserId.get(owner.id)?.count).toBe(0);
      expect(byUserId.get(idleMember.id)?.count).toBe(0);
      expect(byUserId.get(null)).toEqual({
        userId: null,
        name: "Unassigned",
        count: 1,
      });
    });

    it("omits the Unassigned bucket entirely when every issue has an assignee", async () => {
      const { workspace, owner, member, project } = await setupWorkspaceWithProject();
      await issueRepository.create({
        projectId: project.id,
        title: "Assigned",
        position: 1000,
        reporterId: owner.id,
        assigneeId: member.id,
      });

      mockedAuth.mockResolvedValue(sessionFor(owner.id));
      const response = await getWorkspaceWorkload(
        jsonRequest(
          `http://localhost:3000/api/workspaces/${workspace.id}/analytics/workload`,
        ),
        workspaceCtx(workspace.id),
      );
      const body = (await response.json()) as WorkloadBody;

      expect(body.workload.some((entry) => entry.userId === null)).toBe(false);
    });
  });

  describe("Project overview", () => {
    it("only counts issues from the target project, excluding a sibling project in the same workspace", async () => {
      const { workspace, owner, project } = await setupWorkspaceWithProject();
      const siblingProject = await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          name: "Sibling Project",
          key: uniqueKey(),
          ownerId: owner.id,
        },
      });

      await issueRepository.create({
        projectId: project.id,
        title: "Target project issue",
        position: 1000,
        reporterId: owner.id,
        priority: "HIGH",
      });
      // Three issues in the sibling project — if the query ever leaked
      // across projects, `total` below would be 4, not 1.
      for (let i = 0; i < 3; i++) {
        await issueRepository.create({
          projectId: siblingProject.id,
          title: `Sibling issue ${i}`,
          position: 1000 + i,
          reporterId: owner.id,
          priority: "URGENT",
        });
      }

      mockedAuth.mockResolvedValue(sessionFor(owner.id));
      const response = await getProjectOverview(
        jsonRequest(
          `http://localhost:3000/api/projects/${project.id}/analytics/overview`,
        ),
        projectCtx(project.id),
      );
      const body = (await response.json()) as WorkspaceOverviewBody;

      expect(response.status).toBe(200);
      expect(body.total).toBe(1);
      expect(body.byPriority.HIGH).toBe(1);
      expect(body.byPriority.URGENT).toBe(0);
    });
  });

  describe("RBAC", () => {
    it("a plain MEMBER can read all three analytics endpoints", async () => {
      const { workspace, member, project } = await setupWorkspaceWithProject();
      mockedAuth.mockResolvedValue(sessionFor(member.id));

      const overview = await getWorkspaceOverview(
        jsonRequest(
          `http://localhost:3000/api/workspaces/${workspace.id}/analytics/overview`,
        ),
        workspaceCtx(workspace.id),
      );
      const workload = await getWorkspaceWorkload(
        jsonRequest(
          `http://localhost:3000/api/workspaces/${workspace.id}/analytics/workload`,
        ),
        workspaceCtx(workspace.id),
      );
      const projectOverview = await getProjectOverview(
        jsonRequest(
          `http://localhost:3000/api/projects/${project.id}/analytics/overview`,
        ),
        projectCtx(project.id),
      );

      expect(overview.status).toBe(200);
      expect(workload.status).toBe(200);
      expect(projectOverview.status).toBe(200);
    });
  });

  describe("Enumeration safety", () => {
    it("a non-member gets 404 on all three analytics endpoints", async () => {
      const { workspace, outsider, project } = await setupWorkspaceWithProject();
      mockedAuth.mockResolvedValue(sessionFor(outsider.id));

      const overview = await getWorkspaceOverview(
        jsonRequest(
          `http://localhost:3000/api/workspaces/${workspace.id}/analytics/overview`,
        ),
        workspaceCtx(workspace.id),
      );
      const workload = await getWorkspaceWorkload(
        jsonRequest(
          `http://localhost:3000/api/workspaces/${workspace.id}/analytics/workload`,
        ),
        workspaceCtx(workspace.id),
      );
      const projectOverview = await getProjectOverview(
        jsonRequest(
          `http://localhost:3000/api/projects/${project.id}/analytics/overview`,
        ),
        projectCtx(project.id),
      );

      expect(overview.status).toBe(404);
      expect(workload.status).toBe(404);
      expect(projectOverview.status).toBe(404);
    });

    it("a nonexistent workspace/project id gets 404 on all three analytics endpoints", async () => {
      const { owner } = await setupWorkspaceWithProject();
      mockedAuth.mockResolvedValue(sessionFor(owner.id));
      const fakeId = "00000000-0000-0000-0000-000000000000";

      const overview = await getWorkspaceOverview(
        jsonRequest(`http://localhost:3000/api/workspaces/${fakeId}/analytics/overview`),
        workspaceCtx(fakeId),
      );
      const workload = await getWorkspaceWorkload(
        jsonRequest(`http://localhost:3000/api/workspaces/${fakeId}/analytics/workload`),
        workspaceCtx(fakeId),
      );
      const projectOverview = await getProjectOverview(
        jsonRequest(`http://localhost:3000/api/projects/${fakeId}/analytics/overview`),
        projectCtx(fakeId),
      );

      expect(overview.status).toBe(404);
      expect(workload.status).toBe(404);
      expect(projectOverview.status).toBe(404);
    });
  });
});
