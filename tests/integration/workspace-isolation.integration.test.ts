import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { issueRepository } from "@/repositories/issue/issue.repository";
import { labelRepository } from "@/repositories/issue/label.repository";

import {
  deleteTestUser,
  deleteTestWorkspace,
  sessionFor,
  uniqueEmail,
  uniqueSlug,
} from "./helpers";

// Dedicated isolation suite: a user who belongs to Workspace A must never
// be able to see or act on Workspace B's data through any workspace-scoped
// route, even though they're a fully-privileged member of A. Every
// assertion here checks 404 (not 403) — per the Milestone 3 proposal, a
// non-member response must be indistinguishable from "this resource
// doesn't exist," which is the property that actually prevents workspace
// enumeration. Milestone 4 cleanup pass extended this file with the same
// checks for Issue/Label/Comment (see docs/session-log.md, Increment 7).
vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

const { GET: getWorkspace } = await import("@/app/api/workspaces/[workspaceId]/route");
const { GET: listMembers, POST: addMember } =
  await import("@/app/api/workspaces/[workspaceId]/members/route");
const { GET: listProjects, POST: createProject } =
  await import("@/app/api/workspaces/[workspaceId]/projects/route");
const { GET: getProject } = await import("@/app/api/projects/[projectId]/route");
const { GET: listWorkspaceLabels } =
  await import("@/app/api/workspaces/[workspaceId]/labels/route");
const { GET: getIssue } = await import("@/app/api/issues/[issueId]/route");
const { GET: listIssueLabels } = await import("@/app/api/issues/[issueId]/labels/route");
const { GET: listIssueComments } =
  await import("@/app/api/issues/[issueId]/comments/route");

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

describe("Cross-workspace isolation", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupTwoWorkspaces() {
    const ownerA = await createUser("iso-owner-a");
    const ownerB = await createUser("iso-owner-b");
    emails.push(ownerA.email, ownerB.email);

    const workspaceA = await prisma.workspace.create({
      data: {
        name: "Workspace A",
        slug: uniqueSlug("iso-ws-a"),
        members: { create: { userId: ownerA.id, role: "OWNER" } },
      },
    });
    const workspaceB = await prisma.workspace.create({
      data: {
        name: "Workspace B",
        slug: uniqueSlug("iso-ws-b"),
        members: { create: { userId: ownerB.id, role: "OWNER" } },
      },
    });
    workspaceIds.push(workspaceA.id, workspaceB.id);

    mockedAuth.mockResolvedValue(sessionFor(ownerB.id));
    const projectB = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspaceB.id}/projects`,
        "POST",
        {
          name: "B's Project",
        },
      ),
      workspaceCtx(workspaceB.id),
    );
    const { id: projectBId } = (await projectB.json()) as { id: string };

    const issueB = await issueRepository.create({
      projectId: projectBId,
      title: "B's issue",
      position: 1000,
      reporterId: ownerB.id,
    });
    const labelB = await labelRepository.create({
      workspaceId: workspaceB.id,
      name: "B's label",
      color: "#000000",
    });

    return {
      workspaceA,
      ownerA,
      workspaceB,
      ownerB,
      projectBId,
      issueBId: issueB.id,
      labelBId: labelB.id,
    };
  }

  it("a member of A gets 404 (not the data) fetching B's workspace detail", async () => {
    const { ownerA, workspaceB } = await setupTwoWorkspaces();
    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));

    const response = await getWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspaceB.id}`, "GET"),
      workspaceCtx(workspaceB.id),
    );

    expect(response.status).toBe(404);
  });

  it("a member of A gets 404 listing B's members, and B's roster is unaffected", async () => {
    const { ownerA, workspaceB } = await setupTwoWorkspaces();
    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));

    const response = await listMembers(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspaceB.id}/members`, "GET"),
      workspaceCtx(workspaceB.id),
    );
    expect(response.status).toBe(404);

    const actualMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspaceB.id },
    });
    expect(actualMembers).toHaveLength(1);
  });

  it("a member of A cannot add themselves (or anyone) to B via B's members endpoint", async () => {
    const { ownerA, workspaceB } = await setupTwoWorkspaces();
    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));

    const response = await addMember(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspaceB.id}/members`,
        "POST",
        {
          email: (await prisma.user.findUniqueOrThrow({ where: { id: ownerA.id } }))
            .email,
          role: "ADMIN",
        },
      ),
      workspaceCtx(workspaceB.id),
    );
    expect(response.status).toBe(404);

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspaceB.id, userId: ownerA.id } },
    });
    expect(membership).toBeNull();
  });

  it("a member of A gets 404 listing B's projects", async () => {
    const { ownerA, workspaceB } = await setupTwoWorkspaces();
    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));

    const response = await listProjects(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspaceB.id}/projects`,
        "GET",
      ),
      workspaceCtx(workspaceB.id),
    );

    expect(response.status).toBe(404);
  });

  it("a member of A gets 404 fetching B's project directly by id", async () => {
    const { ownerA, projectBId } = await setupTwoWorkspaces();
    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));

    const response = await getProject(
      jsonRequest(`http://localhost:3000/api/projects/${projectBId}`, "GET"),
      projectCtx(projectBId),
    );

    expect(response.status).toBe(404);
  });

  it("an outsider with no workspace at all gets the identical 404 shape as a cross-workspace member", async () => {
    const outsider = await createUser("iso-outsider");
    emails.push(outsider.email);
    const { ownerA, workspaceB } = await setupTwoWorkspaces();

    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));
    const crossMemberResponse = await getWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspaceB.id}`, "GET"),
      workspaceCtx(workspaceB.id),
    );

    mockedAuth.mockResolvedValue(sessionFor(outsider.id));
    const noWorkspaceResponse = await getWorkspace(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspaceB.id}`, "GET"),
      workspaceCtx(workspaceB.id),
    );

    expect(crossMemberResponse.status).toBe(noWorkspaceResponse.status);
    expect(await crossMemberResponse.json()).toEqual(await noWorkspaceResponse.json());
  });

  it("a member of A gets 404 fetching B's issue directly by id", async () => {
    const { ownerA, issueBId } = await setupTwoWorkspaces();
    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));

    const response = await getIssue(
      jsonRequest(`http://localhost:3000/api/issues/${issueBId}`, "GET"),
      issueCtx(issueBId),
    );

    expect(response.status).toBe(404);
  });

  it("a member of A gets 404 listing B's issue's labels", async () => {
    const { ownerA, issueBId } = await setupTwoWorkspaces();
    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));

    const response = await listIssueLabels(
      jsonRequest(`http://localhost:3000/api/issues/${issueBId}/labels`, "GET"),
      issueCtx(issueBId),
    );

    expect(response.status).toBe(404);
  });

  it("a member of A gets 404 listing B's issue's comments", async () => {
    const { ownerA, issueBId } = await setupTwoWorkspaces();
    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));

    const response = await listIssueComments(
      jsonRequest(`http://localhost:3000/api/issues/${issueBId}/comments`, "GET"),
      issueCtx(issueBId),
    );

    expect(response.status).toBe(404);
  });

  it("a member of A gets 404 listing B's workspace labels", async () => {
    const { ownerA, workspaceB } = await setupTwoWorkspaces();
    mockedAuth.mockResolvedValue(sessionFor(ownerA.id));

    const response = await listWorkspaceLabels(
      jsonRequest(`http://localhost:3000/api/workspaces/${workspaceB.id}/labels`, "GET"),
      workspaceCtx(workspaceB.id),
    );

    expect(response.status).toBe(404);
  });
});
