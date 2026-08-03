import { NextResponse } from "next/server";

import { toIssueBreakdownResponse } from "@/features/analytics/issue-breakdown-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceMembership } from "@/lib/auth/workspace-membership";
import { issueRepository } from "@/repositories/issue/issue.repository";
import { projectRepository } from "@/repositories/workspace/project.repository";

// Same enumeration-safe reasoning as /api/projects/[projectId]/issues —
// a nonexistent project and one the caller isn't a member of both 404
// with the identical body.
const NOT_FOUND = { error: "not_found", message: "Project not found" } as const;

type RouteContext = { params: Promise<{ projectId: string }> };

// Visibility: every workspace Member can see a project's analytics
// (Milestone 3 Decision Point 1) — same bar as viewing its issues
// directly.
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { projectId } = await params;
    const project = await projectRepository.findById(projectId);
    if (!project) return NextResponse.json(NOT_FOUND, { status: 404 });

    const membership = await resolveWorkspaceMembership(
      project.workspaceId,
      session.user.id,
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });

    const [statusCounts, priorityCounts] = await Promise.all([
      issueRepository.countByStatus(projectId),
      issueRepository.countByPriority(projectId),
    ]);

    return NextResponse.json(toIssueBreakdownResponse(statusCounts, priorityCounts));
  } catch (error) {
    return handleApiError(error);
  }
}
