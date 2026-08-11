import type { Metadata } from "next";

import { AdminUserList } from "@/features/admin/components/admin-user-list";

export const metadata: Metadata = { title: "Users — Orbit Admin" };

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">All Users</h1>
      <AdminUserList />
    </div>
  );
}
