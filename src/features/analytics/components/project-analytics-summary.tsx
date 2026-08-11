"use client";

import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBreakdownChart } from "@/features/analytics/components/priority-breakdown-chart";
import { StatusBreakdownChart } from "@/features/analytics/components/status-breakdown-chart";
import { useProjectAnalyticsOverview } from "@/features/analytics/hooks/use-project-analytics-overview";

// No workload chart here — workload isn't a meaningful concept scoped
// to a single project (see the Milestone 5 architecture proposal's UI
// component hierarchy).
export function ProjectAnalyticsSummary({ projectId }: { projectId: string }) {
  const overview = useProjectAnalyticsOverview(projectId);

  if (overview.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return <p className="text-destructive text-sm">Failed to load analytics</p>;
  }

  if (overview.data.total === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No data to analyze yet"
        description="Create issues in this project to see an overview"
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
    </div>
  );
}
