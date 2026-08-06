"use client";

import { FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumn } from "@/features/issue/components/kanban-column";
import { useIssues } from "@/features/issue/hooks/use-issues";
import { ISSUE_STATUSES } from "@/features/issue/schemas/update-issue.schema";
import { useWorkspaceMembers } from "@/features/workspace/hooks/use-workspace-members";

// Client Component (needs useIssues/TanStack Query) mounted inside the
// existing Project detail Server Component page — no new route for this
// increment, the board lives on /w/[slug]/projects/[projectId] alongside
// the project info that was already there.
//
// `workspaceId` is only used to build an assigneeId -> member lookup for
// the card avatars (Increment 4) — reuses the same useWorkspaceMembers
// hook MemberList/EditIssueForm already call (TanStack Query dedupes it
// against any other mount on the page), no new API route.
export function KanbanBoard({
  projectId,
  slug,
  workspaceId,
}: {
  projectId: string;
  slug: string;
  workspaceId: string;
}) {
  const issues = useIssues(projectId);
  const members = useWorkspaceMembers(workspaceId);
  const assigneeById = new Map(
    (members.data ?? []).map((member) => [member.user.id, member.user]),
  );

  if (issues.isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {ISSUE_STATUSES.map((status) => (
          <Skeleton key={status} className="h-64 w-72 shrink-0 rounded-xl" />
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
        description="Issue ในโปรเจกต์นี้จะแสดงที่นี่ — เริ่มสร้าง issue แรกได้จากปุ่ม “Issue ใหม่” ด้านบน"
        className="border-border rounded-xl border border-dashed"
      />
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {ISSUE_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          issues={issues.data.filter((issue) => issue.status === status)}
          slug={slug}
          assigneeById={assigneeById}
        />
      ))}
    </div>
  );
}
