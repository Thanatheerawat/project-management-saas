import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkspaceSettingsForm } from "@/features/workspace/components/workspace-settings-form";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";

export const metadata: Metadata = { title: "ตั้งค่า Workspace — Orbit" };

// Server-side enforcement already lives in PATCH /api/workspaces/[id]
// (requires ADMIN+) — this page-level check is purely UX: a plain Member
// sees their workspace's details read-only instead of a form that would
// 403 on submit.
export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound(); // defensive — the layout already gates this

  const { slug } = await params;
  const resolved = await resolveWorkspaceForRequest(slug, session.user.id);
  if (!resolved) notFound();

  const { workspace, membership } = resolved;
  const canEdit = hasWorkspaceRole(membership.role, "ADMIN");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-xl font-bold">ตั้งค่า Workspace</h1>

      {canEdit ? (
        <WorkspaceSettingsForm
          workspaceId={workspace.id}
          initialName={workspace.name}
          initialSlug={workspace.slug}
          initialDescription={workspace.description ?? ""}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            เฉพาะ Owner หรือ Admin เท่านั้นที่แก้ไขการตั้งค่า Workspace ได้
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-sm">ชื่อ Workspace</span>
            <p className="text-foreground text-sm">{workspace.name}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-sm">Slug</span>
            <p className="text-foreground text-sm">{workspace.slug}</p>
          </div>
          {workspace.description && (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-sm">คำอธิบาย</span>
              <p className="text-foreground text-sm">{workspace.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
