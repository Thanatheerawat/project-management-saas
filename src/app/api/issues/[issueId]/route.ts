import { NextResponse } from "next/server";

import { toIssueResponse } from "@/features/issue/issue-response";
import { updateIssueSchema } from "@/features/issue/schemas/update-issue.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { resolveIssueContext, validateAssignee } from "@/lib/auth/workspace-membership";
import { requireWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { issueRepository } from "@/repositories/issue/issue.repository";

// Same enumeration-safe reasoning as every other detail route in this
// codebase: an issue that doesn't exist and one that exists in a
// workspace the caller isn't a member of both 404 with the identical body.
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
    const { issue, project } = context;

    return NextResponse.json(toIssueResponse(issue, project.key));
  } catch (error) {
    return handleApiError(error);
  }
}

// Any MEMBER+ can edit an issue (Decision Point G, approved) — not
// restricted to the reporter, the assignee, or ADMIN+.
export async function PATCH(request: Request, { params }: RouteContext) {
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
    const { project } = context;

    const body = await request.json();
    const data = updateIssueSchema.parse(body);

    // `data.assigneeId` is truthy only for an actual reassignment — `null`
    // (explicit unassign) and `undefined` (field omitted, don't touch)
    // both skip this check correctly, see updateIssueSchema's comment on
    // why those two are distinguished in the first place. validateAssignee
    // itself returns true when assigneeId is null/undefined, so this reads
    // as "reject only an actual invalid reassignment."
    if (!(await validateAssignee(project.workspaceId, data.assigneeId))) {
      return NextResponse.json(
        {
          error: "invalid_assignee",
          message: "Assignee must be a member of this workspace",
        },
        { status: 400 },
      );
    }

    const updated = await issueRepository.update(issueId, data);

    return NextResponse.json(toIssueResponse(updated, project.key));
  } catch (error) {
    return handleApiError(error);
  }
}

// ADMIN+ only (Decision Point G, approved) — deleting an issue is
// destructive, unlike editing it; matches Project delete's bar.
export async function DELETE(_request: Request, { params }: RouteContext) {
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
    requireWorkspaceRole(context.membership.role, "ADMIN");

    await issueRepository.delete(issueId);

    return NextResponse.json({ message: "Issue deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
