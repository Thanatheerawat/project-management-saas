import { NextResponse } from "next/server";

import {
  AUDIT_ACTIONS,
  toAuditLogEntryResponse,
} from "@/features/admin/audit-log-response";
import type { AuditAction } from "@/generated/prisma/client";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireRole } from "@/lib/auth/rbac";
import { parsePagination } from "@/lib/pagination";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";

// The first UI-facing read of AuditLog since it started recording in
// Milestone 2. An unrecognized `?action=` value is treated as no filter
// (not a 400) — a query-string filter isn't worth failing the whole
// request over the way an invalid PATCH body is.
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
    const actionParam = searchParams.get("action");
    const action = (AUDIT_ACTIONS as readonly string[]).includes(actionParam ?? "")
      ? (actionParam as AuditAction)
      : undefined;

    const [items, total] = await Promise.all([
      auditLogRepository.findMany({ skip, take, action }),
      auditLogRepository.countAll(action),
    ]);

    return NextResponse.json({
      items: items.map(toAuditLogEntryResponse),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
