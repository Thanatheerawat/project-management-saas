import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreateProjectForm } from "@/features/project/components/create-project-form";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";

export const metadata: Metadata = { title: "Create Project — Orbit" };

// Server-side enforcement lives in POST .../projects (requires ADMIN+,
// Decision Point 2 in the approved proposal) — this page-level check keeps
// a plain Member from ever seeing a form that would 403 on submit.
export default async function NewProjectPage({
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
  if (!hasWorkspaceRole(membership.role, "ADMIN")) {
    return (
      <div className="flex max-w-lg flex-col gap-6">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Create Project
        </h1>
        <p className="text-muted-foreground text-sm">
          Only the Owner or Admin can create a project
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        Create New Project
      </h1>
      <CreateProjectForm workspaceId={workspace.id} slug={slug} />
    </div>
  );
}
