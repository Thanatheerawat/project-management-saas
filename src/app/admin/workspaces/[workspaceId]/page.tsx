import type { Metadata } from "next";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AdminWorkspaceDetail } from "@/features/admin/components/admin-workspace-detail";

export const metadata: Metadata = { title: "รายละเอียด Workspace — Orbit Admin" };

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Workspace", href: "/admin/workspaces" },
          { label: "รายละเอียด" },
        ]}
      />
      <AdminWorkspaceDetail workspaceId={workspaceId} />
    </div>
  );
}
