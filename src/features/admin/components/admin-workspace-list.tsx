"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/features/admin/components/pagination-controls";
import { useAdminWorkspaces } from "@/features/admin/hooks/use-admin-workspaces";

// Same "clickable Card list" pattern as WorkspacePicker (Foundation) —
// each row links to the detail page instead of a workspace switch action.
export function AdminWorkspaceList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminWorkspaces(page);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-destructive text-sm">โหลดรายชื่อ Workspace ไม่สำเร็จ</p>;
  }

  if (data.items.length === 0) {
    return <EmptyState icon={Building2} title="ไม่พบ Workspace" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.items.map((workspace) => (
        <Link key={workspace.id} href={`/admin/workspaces/${workspace.id}`}>
          <Card size="sm" className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{workspace.name}</CardTitle>
                <Badge variant="outline">{workspace.memberCount} สมาชิก</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">/{workspace.slug}</span>
              <span className="text-muted-foreground">
                เจ้าของ: {workspace.ownerName ?? workspace.ownerEmail ?? "—"}
              </span>
              <span className="text-muted-foreground">
                {workspace.projectCount} โปรเจกต์
              </span>
              <span className="text-muted-foreground">
                สร้างเมื่อ {new Date(workspace.createdAt).toLocaleDateString("th-TH")}
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}

      <PaginationControls
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onPageChange={setPage}
      />
    </div>
  );
}
