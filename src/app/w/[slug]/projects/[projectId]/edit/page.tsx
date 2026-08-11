import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditProjectForm } from "@/features/project/components/edit-project-form";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { projectRepository } from "@/repositories/workspace/project.repository";

export const metadata: Metadata = { title: "Edit Project — Orbit" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound(); // defensive — the layout already gates this

  const { slug, projectId } = await params;
  const resolved = await resolveWorkspaceForRequest(slug, session.user.id);
  if (!resolved) notFound();

  const { workspace, membership } = resolved;

  const project = await projectRepository.findById(projectId);
  if (!project || project.workspaceId !== workspace.id) notFound();

  // Server-side enforcement lives in PATCH /api/projects/[id] (requires
  // ADMIN+) — this page-level check is purely UX, same as the settings and
  // new-project pages.
  if (!hasWorkspaceRole(membership.role, "ADMIN")) {
    return (
      <div className="flex max-w-lg flex-col gap-6">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Edit Project
        </h1>
        <p className="text-muted-foreground text-sm">
          Only the Owner or Admin can edit this project
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">Edit Project</h1>
      <EditProjectForm
        slug={slug}
        projectId={project.id}
        initialName={project.name}
        initialDescription={project.description ?? ""}
        initialStatus={project.status}
      />
    </div>
  );
}
