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

vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/auth");
const mockedAuth = vi.mocked(auth);

const { POST: createProject } =
  await import("@/app/api/workspaces/[workspaceId]/projects/route");
const { GET: listIssueLabels, POST: attachLabel } =
  await import("@/app/api/issues/[issueId]/labels/route");
const { DELETE: detachLabel } =
  await import("@/app/api/issues/[issueId]/labels/[labelId]/route");

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

function issueCtx(issueId: string) {
  return { params: Promise.resolve({ issueId }) };
}

function issueLabelCtx(issueId: string, labelId: string) {
  return { params: Promise.resolve({ issueId, labelId }) };
}

async function createUser(prefix: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x" },
  });
  return { id: user.id, email };
}

describe("Issue label attach/detach", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupIssueWithLabel() {
    const owner = await createUser("il-owner");
    const member = await createUser("il-member");
    const outsider = await createUser("il-outsider");
    emails.push(owner.email, member.email, outsider.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Issue Label Workspace",
        slug: uniqueSlug("il-ws"),
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    workspaceIds.push(workspace.id);

    mockedAuth.mockResolvedValue(sessionFor(owner.id));
    const projectResponse = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        { name: "Issue Label Project" },
      ),
      workspaceCtx(workspace.id),
    );
    const { id: projectId } = (await projectResponse.json()) as { id: string };

    const issue = await issueRepository.create({
      projectId,
      title: "Labelable issue",
      position: 1000,
      reporterId: owner.id,
    });

    const label = await labelRepository.create({
      workspaceId: workspace.id,
      name: "Bug",
      color: "#C0392B",
    });

    return { workspace, issue, label, owner, member, outsider };
  }

  it("POST attaches an existing label when actor is a plain MEMBER (Decision Point F)", async () => {
    const { issue, label, member } = await setupIssueWithLabel();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await attachLabel(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "POST", {
        labelId: label.id,
      }),
      issueCtx(issue.id),
    );
    const body = (await response.json()) as { id: string; name: string };

    expect(response.status).toBe(201);
    expect(body.id).toBe(label.id);
    expect(body.name).toBe("Bug");
  });

  it("POST returns 404 for a non-member", async () => {
    const { issue, label, outsider } = await setupIssueWithLabel();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await attachLabel(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "POST", {
        labelId: label.id,
      }),
      issueCtx(issue.id),
    );

    expect(response.status).toBe(404);
  });

  it("POST returns 404 not_found when the label belongs to a different workspace", async () => {
    const { issue, member } = await setupIssueWithLabel();
    const otherOwner = await createUser("il-other-owner");
    emails.push(otherOwner.email);
    const otherWorkspace = await prisma.workspace.create({
      data: {
        name: "Other Workspace",
        slug: uniqueSlug("il-other-ws"),
        members: { create: { userId: otherOwner.id, role: "OWNER" } },
      },
    });
    workspaceIds.push(otherWorkspace.id);
    const foreignLabel = await labelRepository.create({
      workspaceId: otherWorkspace.id,
      name: "Foreign",
      color: "#000000",
    });

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await attachLabel(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "POST", {
        labelId: foreignLabel.id,
      }),
      issueCtx(issue.id),
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toBe("Label not found");
  });

  it("POST returns 409 already_attached when attaching the same label twice", async () => {
    const { issue, label, member } = await setupIssueWithLabel();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    await attachLabel(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "POST", {
        labelId: label.id,
      }),
      issueCtx(issue.id),
    );
    const second = await attachLabel(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "POST", {
        labelId: label.id,
      }),
      issueCtx(issue.id),
    );
    const body = (await second.json()) as { error: string };

    expect(second.status).toBe(409);
    expect(body.error).toBe("already_attached");
  });

  it("GET lists attached labels for a member", async () => {
    const { issue, label, member } = await setupIssueWithLabel();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    await attachLabel(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "POST", {
        labelId: label.id,
      }),
      issueCtx(issue.id),
    );

    const response = await listIssueLabels(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "GET"),
      issueCtx(issue.id),
    );
    const body = (await response.json()) as { id: string }[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(label.id);
  });

  it("GET returns 404 for a non-member", async () => {
    const { issue, outsider } = await setupIssueWithLabel();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await listIssueLabels(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "GET"),
      issueCtx(issue.id),
    );

    expect(response.status).toBe(404);
  });

  it("DELETE detaches a label when actor is a plain MEMBER", async () => {
    const { issue, label, member } = await setupIssueWithLabel();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    await attachLabel(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "POST", {
        labelId: label.id,
      }),
      issueCtx(issue.id),
    );

    const response = await detachLabel(
      jsonRequest(
        `http://localhost:3000/api/issues/${issue.id}/labels/${label.id}`,
        "DELETE",
      ),
      issueLabelCtx(issue.id, label.id),
    );
    expect(response.status).toBe(200);

    const remaining = await prisma.issueLabel.findUnique({
      where: { issueId_labelId: { issueId: issue.id, labelId: label.id } },
    });
    expect(remaining).toBeNull();
  });

  it("DELETE returns 404 when the label was never attached", async () => {
    const { issue, label, member } = await setupIssueWithLabel();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await detachLabel(
      jsonRequest(
        `http://localhost:3000/api/issues/${issue.id}/labels/${label.id}`,
        "DELETE",
      ),
      issueLabelCtx(issue.id, label.id),
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toBe("Label not attached to this issue");
  });

  it("DELETE returns 404 for a non-member", async () => {
    const { issue, label, member, outsider } = await setupIssueWithLabel();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    await attachLabel(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/labels`, "POST", {
        labelId: label.id,
      }),
      issueCtx(issue.id),
    );

    mockedAuth.mockResolvedValue(sessionFor(outsider.id));
    const response = await detachLabel(
      jsonRequest(
        `http://localhost:3000/api/issues/${issue.id}/labels/${label.id}`,
        "DELETE",
      ),
      issueLabelCtx(issue.id, label.id),
    );

    expect(response.status).toBe(404);
  });
});
