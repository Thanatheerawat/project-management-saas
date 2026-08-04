"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminWorkspace } from "@/features/admin/hooks/use-admin-workspace";

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
    return <p className="text-destructive text-sm">โหลดข้อมูล Workspace ไม่สำเร็จ</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-xl font-bold">{data.name}</h1>
        <p className="text-muted-foreground text-sm">/{data.slug}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายละเอียด</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DetailRow label="เจ้าของ" value={data.ownerName ?? "—"} />
          <DetailRow label="อีเมลเจ้าของ" value={data.ownerEmail ?? "—"} />
          <DetailRow label="จำนวนสมาชิก" value={String(data.memberCount)} />
          <DetailRow label="จำนวนโปรเจกต์" value={String(data.projectCount)} />
          <DetailRow
            label="สร้างเมื่อ"
            value={new Date(data.createdAt).toLocaleDateString("th-TH")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="text-foreground text-sm">{value}</p>
    </div>
  );
}
