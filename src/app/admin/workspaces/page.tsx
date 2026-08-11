import type { Metadata } from "next";

import { AdminWorkspaceList } from "@/features/admin/components/admin-workspace-list";

export const metadata: Metadata = { title: "Workspace — Orbit Admin" };

export default function AdminWorkspacesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        All Workspaces
      </h1>
      <AdminWorkspaceList />
    </div>
  );
}
