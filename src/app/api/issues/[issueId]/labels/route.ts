import { NextResponse } from "next/server";

import { toLabelResponse } from "@/features/issue/label-response";
import { attachLabelSchema } from "@/features/issue/schemas/attach-label.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { resolveIssueContext } from "@/lib/auth/workspace-membership";
import { issueLabelRepository } from "@/repositories/issue/issue-label.repository";
import { labelRepository } from "@/repositories/issue/label.repository";

// Same enumeration-safe reasoning as /api/issues/[issueId]/route.ts.
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

    const issueLabels = await issueLabelRepository.findManyByIssue(issueId);

    return NextResponse.json(issueLabels.map((il) => toLabelResponse(il.label)));
  } catch (error) {
    return handleApiError(error);
  }
}

// Any MEMBER+ can attach an existing label to an issue — creating the
// label definition itself is ADMIN+ (see
// /api/workspaces/[workspaceId]/labels), but applying one is ordinary
// contributor triage work (Decision Point F, approved).
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
    const { project } = context;

    const body = await request.json();
    const data = attachLabelSchema.parse(body);

    // The label must belong to the same workspace as the issue — a
    // labelId from a different workspace 404s the same way a nonexistent
    // one does, same enumeration-safe pattern as everywhere else.
    const label = await labelRepository.findById(data.labelId);
    if (!label || label.workspaceId !== project.workspaceId) {
      return NextResponse.json(
        { error: "not_found", message: "Label not found" },
        { status: 404 },
      );
    }

    const existing = await issueLabelRepository.findByIssueAndLabel(
      issueId,
      data.labelId,
    );
    if (existing) {
      return NextResponse.json(
        {
          error: "already_attached",
          message: "This label is already attached to the issue",
        },
        { status: 409 },
      );
    }

    await issueLabelRepository.attach(issueId, data.labelId);

    return NextResponse.json(toLabelResponse(label), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
