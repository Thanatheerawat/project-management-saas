import { NextResponse } from "next/server";

import { toCommentResponse } from "@/features/issue/comment-response";
import { createCommentSchema } from "@/features/issue/schemas/create-comment.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { ForbiddenError } from "@/lib/auth/rbac";
import { resolveWorkspaceMembership } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { commentRepository } from "@/repositories/issue/comment.repository";
import { issueRepository } from "@/repositories/issue/issue.repository";
import { projectRepository } from "@/repositories/workspace/project.repository";

const NOT_FOUND = { error: "not_found", message: "Comment not found" } as const;

type RouteContext = { params: Promise<{ commentId: string }> };

// Loads the comment plus enough context (issue -> project -> workspace) to
// authorize it, same "resolve child, derive parent" shape as
// /api/issues/[issueId]/route.ts. Returns null for any broken link in
// that chain (comment missing, its issue missing, its project missing, or
// caller not a workspace member) — all collapse to the same 404, same
// enumeration-safe pattern as everywhere else.
async function resolveCommentContext(commentId: string, userId: string) {
  const comment = await commentRepository.findById(commentId);
  if (!comment) return null;

  const issue = await issueRepository.findById(comment.issueId);
  if (!issue) return null;

  const project = await projectRepository.findById(issue.projectId);
  if (!project) return null;

  const membership = await resolveWorkspaceMembership(project.workspaceId, userId);
  if (!membership) return null;

  return { comment, membership };
}

// Author edits their own comment only (Decision Point H, approved) — not
// ADMIN+, unlike delete below.
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { commentId } = await params;
    const context = await resolveCommentContext(commentId, session.user.id);
    if (!context) return NextResponse.json(NOT_FOUND, { status: 404 });

    if (context.comment.authorId !== session.user.id) throw new ForbiddenError();

    const body = await request.json();
    const data = createCommentSchema.parse(body);

    const updated = await commentRepository.update(commentId, { body: data.body });

    return NextResponse.json(toCommentResponse(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

// Author deletes their own comment, or ADMIN+ moderates anyone's
// (Decision Point H, approved).
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { commentId } = await params;
    const context = await resolveCommentContext(commentId, session.user.id);
    if (!context) return NextResponse.json(NOT_FOUND, { status: 404 });

    const isAuthor = context.comment.authorId === session.user.id;
    const isAdmin = hasWorkspaceRole(context.membership.role, "ADMIN");
    if (!isAuthor && !isAdmin) throw new ForbiddenError();

    await commentRepository.delete(commentId);

    return NextResponse.json({ message: "Comment deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
