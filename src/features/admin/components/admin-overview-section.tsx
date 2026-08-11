"use client";

import { Building2, Database, FolderKanban, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/features/admin/components/stat-card";
import { useAdminHealth } from "@/features/admin/hooks/use-admin-health";
import { useAdminOverview } from "@/features/admin/hooks/use-admin-overview";
import { PriorityBreakdownChart } from "@/features/analytics/components/priority-breakdown-chart";
import { StatusBreakdownChart } from "@/features/analytics/components/status-breakdown-chart";

// Platform-wide counterpart of WorkspaceAnalyticsSection (Milestone 5) —
// same Card+chart layout, plus a stat-tile row (userCount/workspaceCount/
// projectCount/health) that M5's dashboard never needed. Reuses
// StatusBreakdownChart/PriorityBreakdownChart unchanged: GET /api/admin/
// overview feeds the identical IssueBreakdownResponse shape.
export function AdminOverviewSection() {
  const overview = useAdminOverview();
  const health = useAdminHealth();

  if (overview.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[68px]" />
          <Skeleton className="h-[68px]" />
          <Skeleton className="h-[68px]" />
          <Skeleton className="h-[68px]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return <p className="text-destructive text-sm">Failed to load overview</p>;
  }

  const { userCount, workspaceCount, projectCount, issueOverview } = overview.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={userCount} icon={Users} />
        <StatCard label="Total Workspaces" value={workspaceCount} icon={Building2} />
        <StatCard label="Total Projects" value={projectCount} icon={FolderKanban} />
        <HealthStatCard health={health} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Issue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBreakdownChart data={issueOverview.byStatus} />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <PriorityBreakdownChart data={issueOverview.byPriority} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Two distinct failure states (Milestone 6 proposal, "States"): the
// health *request itself* failing (network error, non-2xx — `isError`)
// means "we don't know if the database is up"; the request succeeding
// but reporting `reachable: false` means "we know, and it's down." Each
// gets its own message rather than collapsing both into one generic
// error, since they call for different operator reactions.
function HealthStatCard({ health }: { health: ReturnType<typeof useAdminHealth> }) {
  if (health.isLoading) return <Skeleton className="h-20" />;

  if (health.isError || !health.data) {
    return (
      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <Database className="text-destructive size-5 shrink-0" strokeWidth={1.5} />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Database</span>
            <span className="text-destructive text-sm font-semibold">
              API call failed
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { reachable, latencyMs } = health.data.database;

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <Database
          className={
            reachable
              ? "text-muted-foreground size-5 shrink-0"
              : "text-destructive size-5 shrink-0"
          }
          strokeWidth={1.5}
        />
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Database</span>
          <span
            className={
              reachable
                ? "text-foreground text-sm font-semibold"
                : "text-destructive text-sm font-semibold"
            }
          >
            {reachable ? `Online (${latencyMs}ms)` : "Unresponsive"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
