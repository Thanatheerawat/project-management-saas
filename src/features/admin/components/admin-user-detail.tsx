"use client";

import { Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUser } from "@/features/admin/hooks/use-admin-user";
import { useUpdateAdminUser } from "@/features/admin/hooks/use-update-admin-user";
import { PLATFORM_ROLES } from "@/features/admin/schemas/update-admin-user.schema";
import type { PlatformRole } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api-client";

interface AdminUserDetailProps {
  userId: string;
  currentUserId: string;
  isSuperAdmin: boolean;
}

// Decision Points C2+C3 (Milestone 6 proposal): only SUPER_ADMIN may
// change `role`, and self-role-change/self-deactivation are rejected
// server-side with 400 regardless of privilege. The disabled states here
// are UX only, exactly the two rules this increment specified (role
// selector gated on `isSuperAdmin`, isActive toggle gated on `isSelf`) —
// the route handler is the real enforcement, and it still rejects a
// self-role-change even though this component doesn't separately disable
// the selector for that narrower case.
export function AdminUserDetail({
  userId,
  currentUserId,
  isSuperAdmin,
}: AdminUserDetailProps) {
  const { data, isLoading, isError } = useAdminUser(userId);
  const updateUser = useUpdateAdminUser(userId);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-destructive text-sm">โหลดข้อมูลผู้ใช้ไม่สำเร็จ</p>;
  }

  // Rebound as its own const so the narrowed (non-undefined) type survives
  // into the closures below — TS's control-flow narrowing on `data` itself
  // doesn't carry into nested function declarations.
  const user = data;
  const isSelf = userId === currentUserId;

  async function handleRoleChange(role: string) {
    setError(null);
    try {
      await updateUser.mutateAsync({ role: role as PlatformRole });
      toast.success("เปลี่ยน Role แล้ว");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "เปลี่ยน Role ไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  async function handleToggleActive() {
    setError(null);
    try {
      const wasActive = user.isActive;
      await updateUser.mutateAsync({ isActive: !wasActive });
      toast.success(wasActive ? "ปิดใช้งานบัญชีแล้ว" : "เปิดใช้งานบัญชีแล้ว");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "เปลี่ยนสถานะไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {data.name ?? data.email}
          {isSelf && <span className="text-muted-foreground"> (คุณ)</span>}
        </h1>
        <p className="text-muted-foreground text-sm">{data.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>สิทธิ์การใช้งาน</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">Platform Role</span>
            <select
              aria-label="เปลี่ยน Platform Role"
              value={data.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={!isSuperAdmin || updateUser.isPending}
              className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-fit rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {PLATFORM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {!isSuperAdmin && (
              <span className="text-muted-foreground text-xs">
                เฉพาะ SUPER_ADMIN เท่านั้นที่เปลี่ยน Role ได้
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">สถานะบัญชี</span>
            <div className="flex items-center gap-2">
              <Badge variant={data.isActive ? "outline" : "destructive"}>
                {data.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                disabled={isSelf || updateUser.isPending}
              >
                {data.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              </Button>
            </div>
            {isSelf && (
              <span className="text-muted-foreground text-xs">
                ไม่สามารถเปลี่ยนสถานะบัญชีของตัวเองได้
              </span>
            )}
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace ที่เป็นสมาชิก ({data.workspaces.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.workspaces.length === 0 ? (
            <EmptyState icon={Users} title="ไม่ได้เป็นสมาชิก Workspace ใดเลย" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="border-border flex items-center justify-between gap-2 rounded-xl border p-3"
                >
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {workspace.name}
                    </p>
                    <p className="text-muted-foreground text-xs">/{workspace.slug}</p>
                  </div>
                  <Badge variant="outline">{workspace.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
