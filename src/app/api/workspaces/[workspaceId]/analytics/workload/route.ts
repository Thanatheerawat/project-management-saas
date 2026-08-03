import { NextResponse } from "next/server";

import { toWorkloadResponse } from "@/features/analytics/workload-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-membership";
import { issueRepository } from "@/repositories/issue/issue.repository";
import { workspaceMemberRepository } from "@/repositories/workspace/workspace-member.repository";

const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;

type RouteContext = { params: Promise<{ workspaceId: string }> };

// Same visibility bar as the overview endpoint (Milestone 3 Decision
// Point 1) — any workspace Member can see team workload.
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

    const [assigneeCounts, members] = await Promise.all([
      issueRepository.countByAssigneeForWorkspace(workspaceId),
      workspaceMemberRepository.findManyByWorkspace(workspaceId),
    ]);

    return NextResponse.json({
      workload: toWorkloadResponse(assigneeCounts, members),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
