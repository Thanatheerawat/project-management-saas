import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ISSUE_PRIORITY_COLOR } from "@/constants/issue";
import type { IssueResponse } from "@/features/issue/hooks/use-issues";

// Colors come from inline `style`, not a Tailwind class, because the
// class would have to be built from a dynamic value (the issue's
// priority/label color) — Tailwind's JIT compiler only picks up class
// names it can see statically in source, so a constructed class like
// `text-(--color-priority-${priority})` silently doesn't work.
//
// `slug` is only here to build the Link href (Increment 6) — the card
// itself still renders purely from the embedded IssueResponse, no extra
// fetch.
export function IssueCard({ issue, slug }: { issue: IssueResponse; slug: string }) {
  return (
    <Link
      href={`/w/${slug}/projects/${issue.projectId}/issues/${issue.id}`}
      className="block"
    >
      <Card size="sm" className="hover:ring-foreground/20 transition-shadow">
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
      </Card>
    </Link>
  );
}
