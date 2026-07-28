import { NextResponse } from "next/server";

import { updateWorkspaceMemberRoleSchema } from "@/features/workspace/schemas/update-member-role.schema";
import { toWorkspaceMemberResponse } from "@/features/workspace/workspace-member-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { ForbiddenError } from "@/lib/auth/rbac";
import {
  requireWorkspaceAccess,
  resolveWorkspaceMembership,
} from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { workspaceMemberRepository } from "@/repositories/workspace/workspace-member.repository";

const NOT_FOUND = { error: "not_found", message: "Workspace not found" } as const;
const MEMBER_NOT_FOUND = { error: "not_found", message: "Member not found" } as const;

type RouteContext = { params: Promise<{ workspaceId: string; memberId: string }> };

// Loads the target member row and confirms it actually belongs to
// `workspaceId` from the URL — without this check, an Admin of workspace
// A could guess/enumerate a memberId belonging to workspace B and modify
// it, since a bare `findById(memberId)` alone doesn't scope by workspace.
// Returns null if the target doesn't exist or belongs to a different
// workspace — both cases are indistinguishable 404s to the caller.
async function resolveTargetMember(workspaceId: string, memberId: string) {
  const target = await workspaceMemberRepository.findById(memberId);
  if (!target || target.workspaceId !== workspaceId) return null;
  return target;
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

    const { workspaceId, memberId } = await params;
    // Every actor who can reach this branch is already ADMIN+ (or the
    // request 404s/403s before it) — a simple fixed minRole gate, unlike
    // DELETE below where a plain Member is also allowed in (to
    // self-leave), so DELETE resolves membership without a fixed minRole.
    const actorMembership = await requireWorkspaceAccess(
      workspaceId,
      session.user.id,
      "ADMIN",
    );
    if (!actorMembership) return NextResponse.json(NOT_FOUND, { status: 404 });

    const target = await resolveTargetMember(workspaceId, memberId);
    if (!target) return NextResponse.json(MEMBER_NOT_FOUND, { status: 404 });

    // Ownership only ever moves via a dedicated transfer-ownership action
    // (not built in this milestone — see the Milestone 3 Architecture
    // Proposal) — this endpoint can't touch the Owner's role at all,
    // which also keeps the "exactly one Owner" invariant intact without
    // needing a DB constraint for it.
    if (target.role === "OWNER") {
      return NextResponse.json(
        {
          error: "owner_role_immutable",
          message: "Transfer ownership instead of changing the owner's role",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const data = updateWorkspaceMemberRoleSchema.parse(body);

    const updated = await workspaceMemberRepository.updateRole(memberId, data.role);

    return NextResponse.json(toWorkspaceMemberResponse(updated));
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

    const { workspaceId, memberId } = await params;
    // No fixed minRole here — a plain Member is allowed in too, so they
    // can self-leave; the branch below decides based on actor vs target.
    const actorMembership = await resolveWorkspaceMembership(
      workspaceId,
      session.user.id,
    );
    if (!actorMembership) return NextResponse.json(NOT_FOUND, { status: 404 });

    const target = await resolveTargetMember(workspaceId, memberId);
    if (!target) return NextResponse.json(MEMBER_NOT_FOUND, { status: 404 });

    // The Owner can never be removed through this generic endpoint,
    // regardless of who's asking — same reasoning as the role-change
    // guard above.
    if (target.role === "OWNER") {
      return NextResponse.json(
        {
          error: "owner_immutable",
          message: "Transfer ownership before removing the owner",
        },
        { status: 400 },
      );
    }

    // Owner/Admin can remove anyone (except the Owner, blocked above); a
    // plain Member can only remove themselves (self-leave).
    const isPrivileged = hasWorkspaceRole(actorMembership.role, "ADMIN");
    const isSelf = target.userId === session.user.id;
    if (!isPrivileged && !isSelf) throw new ForbiddenError();

    await workspaceMemberRepository.delete(memberId);

    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
