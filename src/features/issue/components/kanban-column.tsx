import { Badge } from "@/components/ui/badge";
import { ISSUE_STATUS_COLOR } from "@/constants/issue";
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
export function KanbanColumn({ status, issues, slug, assigneeById }: KanbanColumnProps) {
  return (
    <div className="bg-muted/30 border-border/60 flex w-72 shrink-0 flex-col gap-3 rounded-xl border p-2.5">
      <div className="flex items-center gap-2 px-1 pt-0.5">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: ISSUE_STATUS_COLOR[status] }}
          aria-hidden="true"
        />
        <h3 className="text-foreground text-xs font-semibold tracking-wide uppercase">
          {status}
        </h3>
        <Badge variant="secondary" className="ml-auto">
          {issues.length}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        {issues.length === 0 ? (
          <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-xs">
            ไม่มี issue
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
