import { ISSUE_STATUS_COLOR } from "@/constants/issue";
import { IssueCard } from "@/features/issue/components/issue-card";
import type { IssueResponse } from "@/features/issue/hooks/use-issues";
import type { IssueStatus } from "@/generated/prisma/client";

interface KanbanColumnProps {
  status: IssueStatus;
  issues: IssueResponse[];
  slug: string;
}

// No drag-and-drop yet (Decision Point C, deferred) — this is a
// read-only grouping of the same list useIssues already returns
// pre-sorted by [status, position] (see issueRepository.findManyByProject),
// filtered client-side to one status per column.
export function KanbanColumn({ status, issues, slug }: KanbanColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: ISSUE_STATUS_COLOR[status] }}
        />
        <h3 className="text-foreground text-sm font-semibold">{status}</h3>
        <span className="text-muted-foreground text-xs">{issues.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} slug={slug} />
        ))}
      </div>
    </div>
  );
}
