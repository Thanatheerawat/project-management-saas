import { NextResponse } from "next/server";

import { toIssueResponse } from "@/features/issue/issue-response";
import { createIssueSchema } from "@/features/issue/schemas/create-issue.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import {
  resolveWorkspaceMembership,
  validateAssignee,
} from "@/lib/auth/workspace-membership";
import { issueRepository } from "@/repositories/issue/issue.repository";
import { projectRepository } from "@/repositories/workspace/project.repository";

// Same enumeration-safe reasoning as /api/projects/[projectId]/route.ts —
// a nonexistent project and one the caller isn't a member of return the
// identical body.
const NOT_FOUND = { error: "not_found", message: "Project not found" } as const;

// New issues are appended to the end of the BACKLOG column (every issue
// starts there — status isn't client-settable at creation, see
// createIssueSchema) rather than needing the client to supply a position.
// A large, constant gap (not 1) leaves room for a future drag-and-drop
// increment to compute a midpoint between neighbors without immediately
// running out of headroom.
const POSITION_GAP = 1000;

type RouteContext = { params: Promise<{ projectId: string }> };

// Visibility: every workspace Member can see every issue in a project
// they can see — Milestone 3's Decision Point 1 (workspace-wide project
// visibility) already covers this, there's no separate per-issue rule.
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

    const issues = await issueRepository.findManyByProject(projectId);

    return NextResponse.json(issues.map((issue) => toIssueResponse(issue, project.key)));
  } catch (error) {
    return handleApiError(error);
  }
}

// Any MEMBER+ can file an issue (Decision Point G, approved) — unlike
// Project creation, which is ADMIN+ only, issues are day-to-day
// contributor work, not workspace structure.
export async function POST(request: Request, { params }: RouteContext) {
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

    const body = await request.json();
    const data = createIssueSchema.parse(body);

    // The assignee must belong to the same workspace as the issue — no FK
    // can express this cross-table constraint, so it's enforced here
    // (Milestone 4 Architecture Review, Risk 5).
    if (!(await validateAssignee(project.workspaceId, data.assigneeId))) {
      return NextResponse.json(
        {
          error: "invalid_assignee",
          message: "Assignee must be a member of this workspace",
        },
        { status: 400 },
      );
    }

    const maxPosition = await issueRepository.findMaxPositionInStatus(
      projectId,
      "BACKLOG",
    );
    const position = (maxPosition._max.position ?? 0) + POSITION_GAP;

    const issue = await issueRepository.create({
      projectId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      assigneeId: data.assigneeId,
      reporterId: session.user.id,
      position,
    });

    return NextResponse.json(toIssueResponse(issue, project.key), {
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
