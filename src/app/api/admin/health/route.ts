import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { requireRole } from "@/lib/auth/rbac";
import { healthRepository } from "@/repositories/system/health.repository";

// Decision Point E1 (Milestone 6 proposal): DB-reachability check only,
// not a full ops dashboard — serverless has no persistent process to
// report CPU/memory/uptime on. Always resolves 200: healthRepository.ping
// never throws, it reports `reachable: false` on failure, since this
// endpoint's job is to say the database is down, not go down with it.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }
    requireRole(session.user.role, "ADMIN");

    const database = await healthRepository.ping();

    return NextResponse.json({ database });
  } catch (error) {
    return handleApiError(error);
  }
}
