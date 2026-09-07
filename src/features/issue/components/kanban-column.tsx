import { ISSUE_STATUS_COLOR, ISSUE_STATUS_LABEL } from "@/constants/issue";
import { IssueCard } from "@/features/issue/components/issue-card";
import type { IssueResponse } from "@/features/issue/hooks/use-issues";
import type { WorkspaceMemberResponse } from "@/features/workspace/hooks/use-workspace-members";
import type { IssueStatus } from "@/generated/prisma/client";

interface KanbanColumnProps {
  status: IssueStatus;
  issues: IssueResponse[];
  slug: string;
  assigneeById: Map<string, WorkspaceMemberResponse["user"]>;
}

// No drag-and-drop yet (Decision Point C, deferred) — this is a
// read-only grouping of the same list useIssues already returns
// pre-sorted by [status, position] (see issueRepository.findManyByProject),
// filtered client-side to one status per column.
//
// Phase 3 (Signal & Structure): status now shows as a 2px top edge in the
// status colour rather than a small dot next to the label — the colour
// becomes part of the column's own structure instead of a decoration
// inside it, so it reads at a glance even when scrolled past. The issue
// count moved from a filled Badge to a plain mono numeral: it's
// system-generated data (a live count), which is exactly what the
// monospace typeface is reserved for in this design language, and one
// fewer filled pill per column reduces the badge noise the redesign is
// meant to fix. `rounded-lg` (was `rounded-xl`): a slightly tighter
// radius for a column-sized container reads more like a structured panel
// than a soft card, without breaking the shared 4/8/12px radius scale.
export function KanbanColumn({ status, issues, slug, assigneeById }: KanbanColumnProps) {
  return (
    <div
      className="bg-muted/30 border-border/60 flex w-72 shrink-0 flex-col gap-3 rounded-lg border border-t-2 p-2.5"
      style={{ borderTopColor: ISSUE_STATUS_COLOR[status] }}
    >
      <div className="flex items-center gap-2 px-1 pt-0.5">
        <h3 className="text-foreground text-xs font-semibold tracking-wide uppercase">
          {ISSUE_STATUS_LABEL[status]}
        </h3>
        <span className="text-muted-foreground ml-auto font-mono text-xs">
          {issues.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {issues.length === 0 ? (
          <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-xs">
            No issues
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              slug={slug}
              assignee={issue.assigneeId ? assigneeById.get(issue.assigneeId) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
