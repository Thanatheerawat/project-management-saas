import { NextResponse } from "next/server";

import { toIssueBreakdownResponse } from "@/features/analytics/issue-breakdown-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireRole } from "@/lib/auth/rbac";
import { userRepository } from "@/repositories/auth/user.repository";
import { issueRepository } from "@/repositories/issue/issue.repository";
import { projectRepository } from "@/repositories/workspace/project.repository";
import { workspaceRepository } from "@/repositories/workspace/workspace.repository";

// Platform-wide system overview — the first real caller of PlatformRole
// (see docs/session-log.md, Milestone 6 proposal). `issueOverview` reuses
// toIssueBreakdownResponse unchanged: countByStatusGlobal/
// countByPriorityGlobal return the identical shape the workspace-scoped
// aggregation already produces, just without a `where` clause.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }
    requireRole(session.user.role, "ADMIN");

    const [userCount, workspaceCount, projectCount, statusCounts, priorityCounts] =
      await Promise.all([
        userRepository.countAll(),
        workspaceRepository.countAll(),
        projectRepository.countAll(),
        issueRepository.countByStatusGlobal(),
        issueRepository.countByPriorityGlobal(),
      ]);

    return NextResponse.json({
      userCount,
      workspaceCount,
      projectCount,
      issueOverview: toIssueBreakdownResponse(statusCounts, priorityCounts),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
