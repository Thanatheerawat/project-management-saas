import { ISSUE_PRIORITY_COLOR, ISSUE_STATUS_COLOR } from "@/constants/issue";
import type { IssuePriority, IssueStatus } from "@/generated/prisma/client";

type StatusCount = { status: IssueStatus; _count: number };
type PriorityCount = { priority: IssuePriority; _count: number };

// Used by both the workspace-wide and project-scoped analytics overview
// endpoints — same shape either way, just a different `where` scope on
// the repository side. Zero-fills every status/priority (not just the
// ones present in the grouped query result) so a project with 0
// CANCELLED issues still reports "0", not an omitted key — the same
// "don't silently drop data" principle the codebase already applies
// elsewhere. `ISSUE_STATUS_COLOR`/`ISSUE_PRIORITY_COLOR`
// (constants/issue.ts) are reused as the canonical key set purely for
// their declaration order, so chart iteration order automatically
// matches the Kanban board's column order and the priority badge's
// severity order — one source of truth for "what are all the values and
// in what order," not a second hardcoded list.
export function toIssueBreakdownResponse(
  statusCounts: StatusCount[],
  priorityCounts: PriorityCount[],
) {
  const byStatus = Object.fromEntries(
    Object.keys(ISSUE_STATUS_COLOR).map((status) => [status, 0]),
  ) as Record<IssueStatus, number>;
  for (const row of statusCounts) {
    byStatus[row.status] = row._count;
  }

  const byPriority = Object.fromEntries(
    Object.keys(ISSUE_PRIORITY_COLOR).map((priority) => [priority, 0]),
  ) as Record<IssuePriority, number>;
  for (const row of priorityCounts) {
    byPriority[row.priority] = row._count;
  }

  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return { total, byStatus, byPriority };
}
