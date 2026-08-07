"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/features/admin/components/pagination-controls";
import { useAdminWorkspaces } from "@/features/admin/hooks/use-admin-workspaces";

// Table-based (Increment 4, M6.5) — was a list of clickable Cards
// (WorkspacePicker's pattern). Same row-as-link-around-the-identity-cell
// convention as AdminUserList — see that file's comment for why a <tr>
// can't wrap an <a> directly.
export function AdminWorkspaceList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminWorkspaces(page);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-destructive text-sm">โหลดรายชื่อ Workspace ไม่สำเร็จ</p>;
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="ไม่พบ Workspace"
        description="Workspace ที่สร้างในระบบจะแสดงที่นี่"
        className="border-border rounded-xl border border-dashed"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border overflow-hidden rounded-xl border">
        <Table aria-label="รายชื่อ Workspace ทั้งหมด">
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead>เจ้าของ</TableHead>
              <TableHead className="text-right">สมาชิก</TableHead>
              <TableHead className="text-right">โปรเจกต์</TableHead>
              <TableHead className="text-right">สร้างเมื่อ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((workspace) => (
              <TableRow key={workspace.id}>
                <TableCell className="whitespace-normal">
                  <Link
                    href={`/admin/workspaces/${workspace.id}`}
                    className="focus-visible:ring-ring/50 -m-1 flex flex-col gap-0.5 rounded-md p-1 outline-none focus-visible:ring-[3px]"
                  >
                    <span className="text-foreground text-sm font-medium">
                      {workspace.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      /{workspace.slug}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {workspace.ownerName ?? workspace.ownerEmail ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline">{workspace.memberCount}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-xs">
                  {workspace.projectCount}
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-xs">
                  {new Date(workspace.createdAt).toLocaleDateString("th-TH")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onPageChange={setPage}
      />
    </div>
  );
}
