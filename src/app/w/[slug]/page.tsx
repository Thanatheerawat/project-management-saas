import { FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceAnalyticsSection } from "@/features/analytics/components/workspace-analytics-section";
import { RecentActivitySection } from "@/features/workspace/components/recent-activity-section";
import { RecentProjectCard } from "@/features/workspace/components/recent-project-card";
import { WorkspaceKpiCards } from "@/features/workspace/components/workspace-kpi-cards";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { projectRepository } from "@/repositories/workspace/project.repository";

export const metadata: Metadata = { title: "Dashboard — Orbit" };

// "Shell" deliberately: shows workspace info and a read-only project
// preview via the already-approved GET .../projects endpoint's underlying
// repository call. Cards link into the dedicated Project UI (list/detail),
// now that it exists.
export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound(); // defensive — the layout already gates this

  const { slug } = await params;
  const resolved = await resolveWorkspaceForRequest(slug, session.user.id);
  if (!resolved) notFound();

  const { workspace } = resolved;
  const projects = await projectRepository.findManyByWorkspace(workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {workspace.name}
        </h1>
        {workspace.description && (
          <p className="text-muted-foreground text-sm">{workspace.description}</p>
        )}
      </div>

      <WorkspaceKpiCards workspaceId={workspace.id} projectCount={projects.length} />

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-sm font-semibold">Recent Projects</h2>
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Projects in this workspace will appear here"
            action={
              <Button size="sm" asChild>
                <Link href={`/w/${slug}/projects/new`}>Create your first project</Link>
              </Button>
            }
            className="border-border rounded-xl border border-dashed"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <RecentProjectCard
                key={project.id}
                project={project}
                href={`/w/${slug}/projects/${project.id}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-sm font-semibold">Recent Activity</h2>
        <RecentActivitySection />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-sm font-semibold">Overview</h2>
        <WorkspaceAnalyticsSection workspaceId={workspace.id} />
      </div>
    </div>
  );
}
