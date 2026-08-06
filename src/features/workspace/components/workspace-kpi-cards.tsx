"use client";

import { CheckCircle2, FolderKanban, ListTodo, Users } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/features/admin/components/stat-card";
import { useWorkspaceAnalyticsOverview } from "@/features/analytics/hooks/use-workspace-analytics-overview";
import { useWorkspaceMembers } from "@/features/workspace/hooks/use-workspace-members";

// All four numbers come from queries that already existed before this
// increment (the same analytics-overview + members-list requests
// WorkspaceAnalyticsSection/MemberList already make — TanStack Query
// dedupes by queryKey, so this doesn't add a second network round trip
// for a page that also renders those) — no new API route. `projectCount`
// is passed in from the Server Component's existing
// projectRepository.findManyByWorkspace() call rather than re-fetched
// here, for the same reason.
//
// Reuses admin's StatCard verbatim rather than building a second "KPI
// tile" component — the M6.5 audit's whole complaint was two different
// visual languages for the same concept (admin had stat tiles, the
// workspace dashboard didn't), so introducing a third would repeat
// exactly that mistake instead of fixing it.
export function WorkspaceKpiCards({
  workspaceId,
  projectCount,
}: {
  workspaceId: string;
  projectCount: number;
}) {
  const overview = useWorkspaceAnalyticsOverview(workspaceId);
  const members = useWorkspaceMembers(workspaceId);

  if (overview.isLoading || members.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[68px]" />
        <Skeleton className="h-[68px]" />
        <Skeleton className="h-[68px]" />
        <Skeleton className="h-[68px]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="โปรเจกต์ทั้งหมด" value={projectCount} icon={FolderKanban} />
      <StatCard label="Issue ทั้งหมด" value={overview.data?.total ?? 0} icon={ListTodo} />
      <StatCard label="สมาชิก Workspace" value={members.data?.length ?? 0} icon={Users} />
      <StatCard
        label="Issue ที่เสร็จแล้ว"
        value={overview.data?.byStatus.DONE ?? 0}
        icon={CheckCircle2}
      />
    </div>
  );
}
