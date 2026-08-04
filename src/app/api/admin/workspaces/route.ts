import { NextResponse } from "next/server";

import { toAdminWorkspaceResponse } from "@/features/admin/admin-workspace-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireRole } from "@/lib/auth/rbac";
import { parsePagination } from "@/lib/pagination";
import { workspaceRepository } from "@/repositories/workspace/workspace.repository";

// Platform-wide workspace list, ADMIN+ (read-only this milestone —
// Decision Point D1, no delete/suspend action here).
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }
    requireRole(session.user.role, "ADMIN");

    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    const [items, total] = await Promise.all([
      workspaceRepository.findManyForAdmin({ skip, take }),
      workspaceRepository.countAll(),
    ]);

    return NextResponse.json({
      items: items.map(toAdminWorkspaceResponse),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
