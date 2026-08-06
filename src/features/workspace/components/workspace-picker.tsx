"use client";

import { FolderKanban } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        title="ยังไม่มี Workspace"
        description="สร้าง Workspace แรกของคุณเพื่อเริ่มจัดการโปรเจกต์"
        action={
          <Button asChild>
            <Link href="/workspaces/new">สร้าง Workspace</Link>
          </Button>
        }
        className="border-border rounded-xl border border-dashed"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((workspace) => (
        <Link key={workspace.id} href={`/w/${workspace.slug}`}>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{workspace.name}</CardTitle>
                <Badge variant="outline">{workspace.role}</Badge>
              </div>
              {workspace.description && (
                <CardDescription>{workspace.description}</CardDescription>
              )}
            </CardHeader>
          </Card>
        </Link>
      ))}
      <Button variant="outline" asChild className="self-start">
        <Link href="/workspaces/new">+ สร้าง Workspace ใหม่</Link>
      </Button>
    </div>
  );
}
