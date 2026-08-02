"use client";

import { FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumn } from "@/features/issue/components/kanban-column";
import { useIssues } from "@/features/issue/hooks/use-issues";
import { ISSUE_STATUSES } from "@/features/issue/schemas/update-issue.schema";

// Client Component (needs useIssues/TanStack Query) mounted inside the
// existing Project detail Server Component page — no new route for this
// increment, the board lives on /w/[slug]/projects/[projectId] alongside
// the project info that was already there.
export function KanbanBoard({ projectId, slug }: { projectId: string; slug: string }) {
  const issues = useIssues(projectId);

  if (issues.isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {ISSUE_STATUSES.map((status) => (
          <Skeleton key={status} className="h-48 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  if (!issues.data) {
    return <p className="text-destructive text-sm">โหลดข้อมูล issue ไม่สำเร็จ</p>;
  }

  if (issues.data.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="ยังไม่มี issue"
        description="Issue ในโปรเจกต์นี้จะแสดงที่นี่"
      />
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {ISSUE_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          issues={issues.data.filter((issue) => issue.status === status)}
          slug={slug}
        />
      ))}
    </div>
  );
}
