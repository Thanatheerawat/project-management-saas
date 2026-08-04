"use client";

import { ScrollText } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AUDIT_ACTIONS } from "@/features/admin/audit-log-response";
import { PaginationControls } from "@/features/admin/components/pagination-controls";
import { useAdminAuditLog } from "@/features/admin/hooks/use-admin-audit-log";
import type { AuditAction } from "@/generated/prisma/client";

// `AUDIT_ACTIONS` is imported from the same module the Increment 2/3
// response mapper and route already use for the identical `?action=`
// filter — one list of valid actions, not a second one redeclared here.
export function AdminAuditLogList() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | undefined>(undefined);
  const { data, isLoading, isError } = useAdminAuditLog(page, action);

  function handleActionChange(value: string) {
    setAction(value === "" ? undefined : (value as AuditAction));
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <select
        aria-label="กรองตาม Action"
        value={action ?? ""}
        onChange={(e) => handleActionChange(e.target.value)}
        className="border-input dark:bg-input/30 h-8 w-fit rounded-lg border bg-transparent px-2.5 text-sm outline-none"
      >
        <option value="">ทุก Action</option>
        {AUDIT_ACTIONS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-destructive text-sm">โหลด Audit Log ไม่สำเร็จ</p>
      ) : data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="ไม่พบ Audit Log" />
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((entry) => (
            <div
              key={entry.id}
              className="border-border flex flex-col gap-1 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline">{entry.action}</Badge>
                <span className="text-foreground text-sm">
                  {entry.user?.name ?? entry.user?.email ?? "ไม่ทราบผู้ใช้"}
                </span>
              </div>
              <span className="text-muted-foreground text-xs">
                {new Date(entry.createdAt).toLocaleString("th-TH")}
              </span>
            </div>
          ))}

          <PaginationControls
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
