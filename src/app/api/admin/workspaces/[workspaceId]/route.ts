import { NextResponse } from "next/server";

import { toAdminWorkspaceResponse } from "@/features/admin/admin-workspace-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireRole } from "@/lib/auth/rbac";
import { workspaceRepository } from "@/repositories/workspace/workspace.repository";

// Plain "resource doesn't exist" 404 — unlike every workspace-scoped
// route under /api/workspaces, this isn't the enumeration-safety
// pattern (hiding whether a workspace exists from a non-member). An
// admin authorized to reach this endpoint at all has no ambiguity to
// protect against; a missing id is just a normal 404.
const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }
    requireRole(session.user.role, "ADMIN");

    const { workspaceId } = await params;
    const workspace = await workspaceRepository.findByIdForAdmin(workspaceId);
    if (!workspace) return NextResponse.json(NOT_FOUND, { status: 404 });

    return NextResponse.json(toAdminWorkspaceResponse(workspace));
  } catch (error) {
    return handleApiError(error);
  }
}
