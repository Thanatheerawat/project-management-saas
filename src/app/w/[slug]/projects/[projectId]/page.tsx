import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectAnalyticsSummary } from "@/features/analytics/components/project-analytics-summary";
import { CreateIssueDialog } from "@/features/issue/components/create-issue-dialog";
import { KanbanBoard } from "@/features/issue/components/kanban-board";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { userRepository } from "@/repositories/auth/user.repository";
import { projectRepository } from "@/repositories/workspace/project.repository";

export const metadata: Metadata = { title: "รายละเอียดโปรเจกต์ — Orbit" };

export default async function ProjectDetailPage({
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
  // Same enumeration-safe reasoning as the API's project routes: a project
  // that doesn't exist and one that exists but belongs to a *different*
  // workspace than the current /w/[slug] both 404 identically — the URL's
  // slug must actually own this project, not just any workspace the caller
  // happens to belong to.
  if (!project || project.workspaceId !== workspace.id) notFound();

  const owner = await userRepository.findById(project.ownerId);
  const canEdit = hasWorkspaceRole(membership.role, "ADMIN");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: workspace.name, href: `/w/${slug}` },
          { label: "โปรเจกต์", href: `/w/${slug}/projects` },
          { label: project.name },
        ]}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-foreground truncate text-2xl font-bold tracking-tight">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-muted-foreground truncate text-sm">
              {project.description}
            </p>
          )}
        </div>
        {canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/w/${slug}/projects/${project.id}/edit`}>แก้ไข</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">สถานะ</span>
          <Badge variant="outline">{project.status}</Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-sm">เจ้าของโปรเจกต์</span>
          <p className="text-foreground text-sm">{owner?.name ?? owner?.email ?? "—"}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-sm">สร้างเมื่อ</span>
          <p className="text-foreground text-sm">
            {new Date(project.createdAt).toLocaleDateString("th-TH")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-sm font-semibold">ภาพรวม</h2>
        <ProjectAnalyticsSummary projectId={project.id} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-foreground text-sm font-semibold">Issue</h2>
          <CreateIssueDialog projectId={project.id} workspaceId={workspace.id} />
        </div>
        <KanbanBoard projectId={project.id} slug={slug} workspaceId={workspace.id} />
      </div>
    </div>
  );
}
