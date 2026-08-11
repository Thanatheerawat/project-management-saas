import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PROJECT_STATUS_LABEL } from "@/constants/project";
import type { Project } from "@/generated/prisma/client";

// Issue count is deliberately not shown here — Increment 3 only surfaces
// data an existing query already returns for this list, and per-project
// issue counts aren't among the fields projectRepository.findManyByWorkspace
// selects (only the project detail page's own analytics query has that,
// scoped to one project at a time). Adding it would mean a new query,
// which is explicitly out of scope this increment.
export function RecentProjectCard({
  project,
  href,
}: {
  project: Pick<Project, "id" | "name" | "key" | "description" | "status" | "updatedAt">;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-[3px]"
    >
      <Card size="sm" className="hover:bg-muted/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                {/* Not CardTitle/a heading: identical text to the project
                  detail page's own <h1> once navigated to — see
                  issue-card.tsx's comment for why a heading here would
                  break e2e navigation assertions. */}
                <p className="text-foreground truncate text-base leading-snug font-medium">
                  {project.name}
                </p>
                <Badge
                  variant="outline"
                  className="text-muted-foreground shrink-0 font-mono text-[10px]"
                >
                  {project.key}
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground truncate text-xs">
                  {project.description}
                </p>
              )}
            </div>
            <Badge variant="outline" className="shrink-0">
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">
            Updated{" "}
            {new Date(project.updatedAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
