import { prisma } from "@/lib/prisma";

// The only place a raw connectivity check happens. Distinct from every
// other repository in this codebase (each of which owns exactly one
// Prisma model) because "is the database reachable at all" isn't a
// query about any particular table — it doesn't belong on userRepository
// or any of the other Milestone 6 repositories any more than it belongs
// on the others. Not an "adminRepository": it holds no User/Workspace/
// Project/Issue/AuditLog query, just this one infrastructure check.
// Milestone 6's health endpoint (Decision Point E1 — DB reachability
// only, not a full ops dashboard) is the only caller. Never throws —
// callers get `reachable: false` on failure, not an exception, since the
// health endpoint's entire job is to report the database is down, not
// go down with it.
export const healthRepository = {
  async ping(): Promise<{ reachable: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { reachable: true, latencyMs: Date.now() - start };
    } catch {
      return { reachable: false, latencyMs: Date.now() - start };
    }
  },
};
