import { NextResponse } from "next/server";

import {
  SECURITY_ACTIVITY_ACTIONS,
  type SecurityActivityAction,
} from "@/constants/security-activity";
import { toSecurityActivityEventResponse } from "@/features/user/security-activity-response";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";

// M8.6: latest 5 events — "restrained," not a dashboard, per the approved
// scope. No pagination: this endpoint intentionally caps out rather than
// growing into one, matching "do not add pagination unless the existing
// architecture clearly requires it."
const RECENT_EVENT_LIMIT = 5;

// Identity comes only from the session — never a client-supplied userId —
// so there is no way to request another user's events through this route.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const events = await auditLogRepository.findRecentForUser(
      session.user.id,
      RECENT_EVENT_LIMIT,
      [...SECURITY_ACTIVITY_ACTIONS],
    );

    return NextResponse.json({
      // The repository query already filters `action IN (...)` to exactly
      // SECURITY_ACTIVITY_ACTIONS, so this narrowing cast reflects a real
      // runtime guarantee (Prisma's own return type is just the full
      // AuditAction enum — it can't express a WHERE-clause-narrowed
      // subset) rather than papering over a real gap.
      events: events.map((event) =>
        toSecurityActivityEventResponse({
          ...event,
          action: event.action as SecurityActivityAction,
        }),
      ),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
