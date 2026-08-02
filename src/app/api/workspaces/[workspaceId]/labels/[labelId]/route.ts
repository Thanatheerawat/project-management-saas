import { NextResponse } from "next/server";

import { toLabelResponse } from "@/features/issue/label-response";
import { updateLabelSchema } from "@/features/issue/schemas/update-label.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-membership";
import { labelRepository } from "@/repositories/issue/label.repository";

const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;
const LABEL_NOT_FOUND = { error: "not_found", message: "Label not found" } as const;

type RouteContext = { params: Promise<{ workspaceId: string; labelId: string }> };

// Loads the target label and confirms it actually belongs to
// `workspaceId` from the URL — without this check, an Admin of workspace
// A could guess/edit a labelId belonging to workspace B, since a bare
// `findById(labelId)` alone doesn't scope by workspace. Same
// cross-workspace tampering guard as members/[memberId]/route.ts's
// resolveTargetMember.
async function resolveTargetLabel(workspaceId: string, labelId: string) {
  const label = await labelRepository.findById(labelId);
  if (!label || label.workspaceId !== workspaceId) return null;
  return label;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { workspaceId, labelId } = await params;
    const membership = await requireWorkspaceAccess(
      workspaceId,
      session.user.id,
      "ADMIN",
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });

    const target = await resolveTargetLabel(workspaceId, labelId);
    if (!target) return NextResponse.json(LABEL_NOT_FOUND, { status: 404 });

    const body = await request.json();
    const data = updateLabelSchema.parse(body);

    if (data.name && data.name !== target.name) {
      const existing = await labelRepository.findByWorkspaceAndName(
        workspaceId,
        data.name,
      );
      if (existing) {
        return NextResponse.json(
          {
            error: "name_taken",
            message: "A label with this name already exists in the workspace",
          },
          { status: 409 },
        );
      }
    }

    const updated = await labelRepository.update(labelId, data);

    return NextResponse.json(toLabelResponse(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const { workspaceId, labelId } = await params;
    const membership = await requireWorkspaceAccess(
      workspaceId,
      session.user.id,
      "ADMIN",
    );
    if (!membership) return NextResponse.json(NOT_FOUND, { status: 404 });

    const target = await resolveTargetLabel(workspaceId, labelId);
    if (!target) return NextResponse.json(LABEL_NOT_FOUND, { status: 404 });

    // Deleting a label cascades its IssueLabel rows (onDelete: Cascade in
    // schema.prisma) — no need to detach it from every issue first.
    await labelRepository.delete(labelId);

    return NextResponse.json({ message: "Label deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
