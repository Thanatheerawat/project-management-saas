import { NextResponse } from "next/server";

import { toAdminUserDetailResponse } from "@/features/admin/admin-user-response";
import { updateAdminUserSchema } from "@/features/admin/schemas/update-admin-user.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireRole } from "@/lib/auth/rbac";
import { userRepository } from "@/repositories/auth/user.repository";

const NOT_FOUND = { error: "not_found", message: "User not found" } as const;

type RouteContext = { params: Promise<{ userId: string }> };

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

    const { userId } = await params;
    const user = await userRepository.findByIdForAdmin(userId);
    if (!user) return NextResponse.json(NOT_FOUND, { status: 404 });

    return NextResponse.json(toAdminUserDetailResponse(user));
  } catch (error) {
    return handleApiError(error);
  }
}

// Decision Points C2+C3 (Milestone 6 proposal): changing `role` requires
// SUPER_ADMIN — a plain ADMIN toggling `isActive` is enough for ordinary
// moderation. Self-role-change and self-deactivation are rejected
// outright with 400, not 403 — this isn't a privilege gap, it's a rule
// that applies regardless of privilege (same reasoning as Milestone 4's
// `invalid_assignee`), mirroring the "Owner is immutable" guard from
// Milestone 3's member management one tier up.
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }
    requireRole(session.user.role, "ADMIN");

    const { userId } = await params;
    const existing = await userRepository.findByIdForAdmin(userId);
    if (!existing) return NextResponse.json(NOT_FOUND, { status: 404 });

    const body = await request.json();
    const data = updateAdminUserSchema.parse(body);

    if (data.role !== undefined) {
      requireRole(session.user.role, "SUPER_ADMIN");
      if (userId === session.user.id) {
        return NextResponse.json(
          {
            error: "self_role_change_forbidden",
            message: "You cannot change your own platform role",
          },
          { status: 400 },
        );
      }
      await userRepository.updateRole(userId, data.role);
    }

    if (data.isActive !== undefined) {
      if (userId === session.user.id) {
        return NextResponse.json(
          {
            error: "self_deactivation_forbidden",
            message: "You cannot deactivate your own account",
          },
          { status: 400 },
        );
      }
      await userRepository.updateActive(userId, data.isActive);
    }

    const updated = await userRepository.findByIdForAdmin(userId);
    if (!updated) return NextResponse.json(NOT_FOUND, { status: 404 });

    return NextResponse.json(toAdminUserDetailResponse(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
