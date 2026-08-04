import type { Metadata } from "next";

import { AdminAuditLogList } from "@/features/admin/components/admin-audit-log-list";

export const metadata: Metadata = { title: "Audit Log — Orbit Admin" };

export default function AdminAuditLogPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-xl font-bold">Audit Log</h1>
      <AdminAuditLogList />
    </div>
  );
}
