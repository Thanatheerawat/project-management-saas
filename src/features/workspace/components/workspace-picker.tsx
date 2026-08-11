"use client";

import { FolderKanban } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaces } from "@/features/workspace/hooks/use-workspaces";

// The 1-workspace auto-redirect happens server-side in workspaces/page.tsx
// before this ever mounts — this component only ever renders for the 0-
// or 2+-workspace cases.
export function WorkspacePicker() {
  const { data, isLoading } = useWorkspaces();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No workspaces yet"
        description="Create your first workspace to start managing projects"
        action={
          <Button asChild>
            <Link href="/workspaces/new">Create Workspace</Link>
          </Button>
        }
        className="border-border rounded-xl border border-dashed"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((workspace) => (
        <Link
          key={workspace.id}
          href={`/w/${workspace.slug}`}
          className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-[3px]"
        >
          <Card size="sm" className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                {/* Not CardTitle/a heading: identical text to the
                  workspace dashboard's own <h1> once navigated to — see
                  issue-card.tsx's comment for why a heading here would
                  break e2e navigation assertions. */}
                <p className="text-foreground min-w-0 truncate text-base leading-snug font-medium">
                  {workspace.name}
                </p>
                <Badge variant="outline" className="shrink-0">
                  {workspace.role}
                </Badge>
              </div>
              {workspace.description && (
                <CardDescription>{workspace.description}</CardDescription>
              )}
            </CardHeader>
          </Card>
        </Link>
      ))}
      <Button variant="outline" asChild className="self-start">
        <Link href="/workspaces/new">+ Create New Workspace</Link>
      </Button>
    </div>
  );
}
