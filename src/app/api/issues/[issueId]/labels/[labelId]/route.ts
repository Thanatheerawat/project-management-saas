import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { resolveIssueContext } from "@/lib/auth/workspace-membership";
import { issueLabelRepository } from "@/repositories/issue/issue-label.repository";

const NOT_FOUND = { error: "not_found", message: "Issue not found" } as const;

type RouteContext = { params: Promise<{ issueId: string; labelId: string }> };

// Any MEMBER+ can detach a label — matches attach's bar (Decision Point F,
// approved).
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { issueId, labelId } = await params;
    const context = await resolveIssueContext(issueId, session.user.id);
    if (!context) return NextResponse.json(NOT_FOUND, { status: 404 });

    const existing = await issueLabelRepository.findByIssueAndLabel(issueId, labelId);
    if (!existing) {
      return NextResponse.json(
        { error: "not_found", message: "Label not attached to this issue" },
        { status: 404 },
      );
    }

    await issueLabelRepository.detach(issueId, labelId);

    return NextResponse.json({ message: "Label removed from issue" });
  } catch (error) {
    return handleApiError(error);
  }
}
