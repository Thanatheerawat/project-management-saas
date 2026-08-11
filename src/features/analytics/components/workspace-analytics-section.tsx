"use client";

import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBreakdownChart } from "@/features/analytics/components/priority-breakdown-chart";
import { StatusBreakdownChart } from "@/features/analytics/components/status-breakdown-chart";
import { WorkloadChart } from "@/features/analytics/components/workload-chart";
import { useWorkspaceAnalyticsOverview } from "@/features/analytics/hooks/use-workspace-analytics-overview";
import { useWorkspaceWorkload } from "@/features/analytics/hooks/use-workspace-workload";

// Client Component (needs the analytics hooks) mounted inside the
// existing workspace dashboard Server Component page — no new route,
// same "mount on the existing page" precedent as KanbanBoard on the
// project detail page (Milestone 4 Increment 5B).
export function WorkspaceAnalyticsSection({ workspaceId }: { workspaceId: string }) {
  const overview = useWorkspaceAnalyticsOverview(workspaceId);
  const workload = useWorkspaceWorkload(workspaceId);

  if (overview.isLoading || workload.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56 sm:col-span-2" />
      </div>
    );
  }

  if (overview.isError || workload.isError || !overview.data || !workload.data) {
    return <p className="text-destructive text-sm">Failed to load analytics</p>;
  }

  // Empty state reserved strictly for "no issues at all" — a workspace
  // with real issues but zero assignments still has real data to show
  // (the workload chart renders just its "Unassigned" bar), so that case
  // never reaches this branch.
  if (overview.data.total === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No data to analyze yet"
        description="Create issues in this workspace's projects to see an overview"
        className="border-border rounded-xl border border-dashed"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Issue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusBreakdownChart data={overview.data.byStatus} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <PriorityBreakdownChart data={overview.data.byPriority} />
        </CardContent>
      </Card>

      <Card size="sm" className="sm:col-span-2">
        <CardHeader>
          <CardTitle>Workload by Assignee</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkloadChart data={workload.data.workload} />
        </CardContent>
      </Card>
    </div>
  );
}
