import type { Metadata } from "next";

import { AdminUserList } from "@/features/admin/components/admin-user-list";

export const metadata: Metadata = { title: "ผู้ใช้ — Orbit Admin" };

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-xl font-bold">ผู้ใช้ทั้งหมด</h1>
      <AdminUserList />
    </div>
  );
}
