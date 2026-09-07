"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminWorkspace } from "@/features/admin/hooks/use-admin-workspace";
import { cn } from "@/lib/utils";

// The title itself depends on fetched data (the page.tsx above this only
// has `workspaceId` from the URL, per Increment 6's "hooks only" scope —
// no repository call server-side), so the heading lives inside this
// Client Component rather than the Server Component page, and the loading
// Skeleton covers it too.
export function AdminWorkspaceDetail({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, isError } = useAdminWorkspace(workspaceId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-destructive text-sm">Failed to load workspace</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{data.name}</h1>
        <p className="text-muted-foreground text-sm">/{data.slug}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DetailRow label="Owner" value={data.ownerName ?? "—"} />
          <DetailRow label="Owner Email" value={data.ownerEmail ?? "—"} />
          <DetailRow label="Member Count" value={String(data.memberCount)} mono />
          <DetailRow label="Project Count" value={String(data.projectCount)} mono />
          <DetailRow
            label="Created"
            value={new Date(data.createdAt).toLocaleDateString("en-US")}
            mono
          />
        </CardContent>
      </Card>
    </div>
  );
}

// `mono`: system-generated counts/timestamps read in JetBrains Mono, same
// rule as Issue Detail's Timestamps section (Phase 4) — Owner/Owner Email
// stay in the default sans since they're human-authored data.
function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className={cn("text-foreground text-sm", mono && "font-mono")}>{value}</p>
    </div>
  );
}
