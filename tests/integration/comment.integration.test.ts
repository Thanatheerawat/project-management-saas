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
const { GET: listComments, POST: createComment } =
  await import("@/app/api/issues/[issueId]/comments/route");
const { PATCH: updateComment, DELETE: deleteComment } =
  await import("@/app/api/comments/[commentId]/route");

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

function commentCtx(commentId: string) {
  return { params: Promise.resolve({ commentId }) };
}

async function createUser(prefix: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail(prefix);
  const user = await prisma.user.create({
    data: { email, name: prefix, passwordHash: "x" },
  });
  return { id: user.id, email };
}

describe("Comment CRUD", () => {
  const emails: string[] = [];
  const workspaceIds: string[] = [];

  afterEach(async () => {
    mockedAuth.mockReset();
    await Promise.all(workspaceIds.splice(0).map(deleteTestWorkspace));
    await Promise.all(emails.splice(0).map(deleteTestUser));
  });

  async function setupIssue() {
    const owner = await createUser("comment-owner");
    const admin = await createUser("comment-admin");
    const member = await createUser("comment-member");
    const outsider = await createUser("comment-outsider");
    emails.push(owner.email, admin.email, member.email, outsider.email);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Comment Workspace",
        slug: uniqueSlug("comment-ws"),
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

    mockedAuth.mockResolvedValue(sessionFor(owner.id));
    const projectResponse = await createProject(
      jsonRequest(
        `http://localhost:3000/api/workspaces/${workspace.id}/projects`,
        "POST",
        { name: "Comment Project" },
      ),
      workspaceCtx(workspace.id),
    );
    const { id: projectId } = (await projectResponse.json()) as { id: string };

    const issue = await issueRepository.create({
      projectId,
      title: "Commentable issue",
      position: 1000,
      reporterId: owner.id,
    });

    return { workspace, issue, owner, admin, member, outsider };
  }

  it("POST creates a comment when actor is a plain MEMBER (Decision Point H)", async () => {
    const { issue, member } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(member.id));

    const response = await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "First comment",
      }),
      issueCtx(issue.id),
    );
    const body = (await response.json()) as { body: string; author: { id: string } };

    expect(response.status).toBe(201);
    expect(body.body).toBe("First comment");
    expect(body.author.id).toBe(member.id);
  });

  it("POST returns 404 for a non-member", async () => {
    const { issue, outsider } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "Should 404",
      }),
      issueCtx(issue.id),
    );

    expect(response.status).toBe(404);
  });

  it("GET lists comments oldest-first", async () => {
    const { issue, member } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "First",
      }),
      issueCtx(issue.id),
    );
    await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "Second",
      }),
      issueCtx(issue.id),
    );

    const response = await listComments(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "GET"),
      issueCtx(issue.id),
    );
    const body = (await response.json()) as { body: string }[];

    expect(response.status).toBe(200);
    expect(body.map((c) => c.body)).toEqual(["First", "Second"]);
  });

  it("GET returns 404 for a non-member", async () => {
    const { issue, outsider } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(outsider.id));

    const response = await listComments(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "GET"),
      issueCtx(issue.id),
    );

    expect(response.status).toBe(404);
  });

  it("PATCH allows the author to edit their own comment", async () => {
    const { issue, member } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const created = await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "Original",
      }),
      issueCtx(issue.id),
    );
    const { id: commentId } = (await created.json()) as { id: string };

    const response = await updateComment(
      jsonRequest(`http://localhost:3000/api/comments/${commentId}`, "PATCH", {
        body: "Edited",
      }),
      commentCtx(commentId),
    );
    const body = (await response.json()) as { body: string };

    expect(response.status).toBe(200);
    expect(body.body).toBe("Edited");
  });

  it("PATCH returns 403 forbidden when the actor is not the author, even if ADMIN+ (Decision Point H)", async () => {
    const { issue, member, admin } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const created = await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "Member's comment",
      }),
      issueCtx(issue.id),
    );
    const { id: commentId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const response = await updateComment(
      jsonRequest(`http://localhost:3000/api/comments/${commentId}`, "PATCH", {
        body: "Admin should not edit",
      }),
      commentCtx(commentId),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("PATCH returns 404 for a non-member", async () => {
    const { issue, member, outsider } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const created = await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "Not yours",
      }),
      issueCtx(issue.id),
    );
    const { id: commentId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(outsider.id));
    const response = await updateComment(
      jsonRequest(`http://localhost:3000/api/comments/${commentId}`, "PATCH", {
        body: "Should 404",
      }),
      commentCtx(commentId),
    );

    expect(response.status).toBe(404);
  });

  it("DELETE allows the author to delete their own comment", async () => {
    const { issue, member } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const created = await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "Delete me",
      }),
      issueCtx(issue.id),
    );
    const { id: commentId } = (await created.json()) as { id: string };

    const response = await deleteComment(
      jsonRequest(`http://localhost:3000/api/comments/${commentId}`, "DELETE"),
      commentCtx(commentId),
    );
    expect(response.status).toBe(200);

    const remaining = await prisma.comment.findUnique({ where: { id: commentId } });
    expect(remaining).toBeNull();
  });

  it("DELETE allows ADMIN+ to moderate-delete someone else's comment (Decision Point H)", async () => {
    const { issue, member, admin } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const created = await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "Moderate me",
      }),
      issueCtx(issue.id),
    );
    const { id: commentId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(admin.id));
    const response = await deleteComment(
      jsonRequest(`http://localhost:3000/api/comments/${commentId}`, "DELETE"),
      commentCtx(commentId),
    );
    expect(response.status).toBe(200);

    const remaining = await prisma.comment.findUnique({ where: { id: commentId } });
    expect(remaining).toBeNull();
  });

  it("DELETE returns 403 forbidden for a plain MEMBER who is neither author nor ADMIN+", async () => {
    const { issue, owner, member } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(owner.id));
    const created = await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "Owner's comment",
      }),
      issueCtx(issue.id),
    );
    const { id: commentId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const response = await deleteComment(
      jsonRequest(`http://localhost:3000/api/comments/${commentId}`, "DELETE"),
      commentCtx(commentId),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("DELETE returns 404 for a non-member", async () => {
    const { issue, member, outsider } = await setupIssue();
    mockedAuth.mockResolvedValue(sessionFor(member.id));
    const created = await createComment(
      jsonRequest(`http://localhost:3000/api/issues/${issue.id}/comments`, "POST", {
        body: "Not yours",
      }),
      issueCtx(issue.id),
    );
    const { id: commentId } = (await created.json()) as { id: string };

    mockedAuth.mockResolvedValue(sessionFor(outsider.id));
    const response = await deleteComment(
      jsonRequest(`http://localhost:3000/api/comments/${commentId}`, "DELETE"),
      commentCtx(commentId),
    );

    expect(response.status).toBe(404);
  });
});
