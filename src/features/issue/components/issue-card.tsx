import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ISSUE_PRIORITY_COLOR } from "@/constants/issue";
import type { IssueResponse } from "@/features/issue/hooks/use-issues";
import type { WorkspaceMemberResponse } from "@/features/workspace/hooks/use-workspace-members";
import { getInitials } from "@/lib/utils";

type Assignee = WorkspaceMemberResponse["user"];

// Colors come from inline `style`, not a Tailwind class, because the
// class would have to be built from a dynamic value (the issue's
// priority/label color) — Tailwind's JIT compiler only picks up class
// names it can see statically in source, so a constructed class like
// `text-(--color-priority-${priority})` silently doesn't work.
//
// `slug` is only here to build the Link href (Increment 6) — the card
// itself still renders purely from the embedded IssueResponse, no extra
// fetch. `assignee` (Increment 4) is resolved by the parent KanbanColumn
// from a workspace-members lookup — the card itself doesn't fetch
// anything beyond what it already had.
export function IssueCard({
  issue,
  slug,
  assignee,
}: {
  issue: IssueResponse;
  slug: string;
  assignee?: Assignee;
}) {
  return (
    <Link
      href={`/w/${slug}/projects/${issue.projectId}/issues/${issue.id}`}
      className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-[3px]"
    >
      <Card
        size="sm"
        className="hover:border-foreground/20 border border-transparent transition-all hover:shadow-xs"
      >
        <CardHeader>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-mono text-xs">{issue.key}</span>
              {issue.priority !== "NONE" && (
                <Badge
                  variant="outline"
                  style={{
                    color: ISSUE_PRIORITY_COLOR[issue.priority],
                    borderColor: ISSUE_PRIORITY_COLOR[issue.priority],
                  }}
                >
                  {issue.priority}
                </Badge>
              )}
            </div>
            <CardTitle className="text-sm font-medium">{issue.title}</CardTitle>
            {issue.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {issue.labels.map((label) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    style={{ color: label.color, borderColor: label.color }}
                  >
                    {label.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-end">
          {assignee ? (
            <>
              <span className="sr-only">
                มอบหมายให้ {assignee.name ?? assignee.email}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="size-6" aria-hidden="true">
                    {assignee.image && <AvatarImage src={assignee.image} alt="" />}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(assignee)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{assignee.name ?? assignee.email}</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <span className="text-faint text-xs">ไม่มอบหมาย</span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
