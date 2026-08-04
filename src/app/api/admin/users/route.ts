import { NextResponse } from "next/server";

import { toAdminUserListItemResponse } from "@/features/admin/admin-user-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireRole } from "@/lib/auth/rbac";
import { parsePagination } from "@/lib/pagination";
import { userRepository } from "@/repositories/auth/user.repository";

// Platform-wide user list, ADMIN+. `email` is an optional
// case-insensitive substring filter (Postgres ILIKE via Prisma's
// `mode: "insensitive"`), shared between the list and its count so the
// paginated total always matches what the filtered list returned.
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
    const emailQuery = searchParams.get("email") ?? undefined;

    const [items, total] = await Promise.all([
      userRepository.findManyForAdmin({ skip, take, emailQuery }),
      userRepository.countAll(emailQuery),
    ]);

    return NextResponse.json({
      items: items.map(toAdminUserListItemResponse),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
