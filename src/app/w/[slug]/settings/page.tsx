import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkspaceSettingsForm } from "@/features/workspace/components/workspace-settings-form";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";

export const metadata: Metadata = { title: "Workspace Settings — Orbit" };

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
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        Workspace Settings
      </h1>

      {canEdit ? (
        <WorkspaceSettingsForm
          workspaceId={workspace.id}
          initialName={workspace.name}
          initialSlug={workspace.slug}
          initialDescription={workspace.description ?? ""}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Only the Owner or Admin can edit workspace settings
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-sm">Workspace Name</span>
            <p className="text-foreground text-sm">{workspace.name}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-sm">Slug</span>
            <p className="text-foreground text-sm">{workspace.slug}</p>
          </div>
          {workspace.description && (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-sm">Description</span>
              <p className="text-foreground text-sm">{workspace.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
