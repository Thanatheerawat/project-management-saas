import { NextResponse } from "next/server";

import { toCommentResponse } from "@/features/issue/comment-response";
import { createCommentSchema } from "@/features/issue/schemas/create-comment.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { resolveIssueContext } from "@/lib/auth/workspace-membership";
import { commentRepository } from "@/repositories/issue/comment.repository";

const NOT_FOUND = { error: "not_found", message: "Issue not found" } as const;

type RouteContext = { params: Promise<{ issueId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { issueId } = await params;
    const context = await resolveIssueContext(issueId, session.user.id);
    if (!context) return NextResponse.json(NOT_FOUND, { status: 404 });

    const comments = await commentRepository.findManyByIssue(issueId);

    return NextResponse.json(comments.map(toCommentResponse));
  } catch (error) {
    return handleApiError(error);
  }
}

// Any MEMBER+ can comment (Decision Point H, approved).
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { issueId } = await params;
    const context = await resolveIssueContext(issueId, session.user.id);
    if (!context) return NextResponse.json(NOT_FOUND, { status: 404 });

    const body = await request.json();
    const data = createCommentSchema.parse(body);

    const comment = await commentRepository.create({
      issueId,
      authorId: session.user.id,
      body: data.body,
    });

    return NextResponse.json(toCommentResponse(comment), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
