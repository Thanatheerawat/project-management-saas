import { NextResponse } from "next/server";

import { toIssueBreakdownResponse } from "@/features/analytics/issue-breakdown-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-membership";
import { issueRepository } from "@/repositories/issue/issue.repository";

const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;

type RouteContext = { params: Promise<{ workspaceId: string }> };

// Visibility: every workspace Member can see analytics (Milestone 3
// Decision Point 1) — a read-only aggregate of data a member can already
// see resource-by-resource, so it inherits that bar rather than needing
// a new permission tier.
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { workspaceId } = await params;
    const membership = await requireWorkspaceAccess(
      workspaceId,
      session.user.id,
      "MEMBER",
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });

    const [statusCounts, priorityCounts] = await Promise.all([
      issueRepository.countByStatusForWorkspace(workspaceId),
      issueRepository.countByPriorityForWorkspace(workspaceId),
    ]);

    return NextResponse.json(toIssueBreakdownResponse(statusCounts, priorityCounts));
  } catch (error) {
    return handleApiError(error);
  }
}
