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

export const metadata: Metadata = { title: "แดชบอร์ด — Orbit" };

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
      <div>
        <h1 className="text-foreground text-xl font-bold">{workspace.name}</h1>
        {workspace.description && (
          <p className="text-muted-foreground text-sm">{workspace.description}</p>
        )}
      </div>

      <WorkspaceKpiCards workspaceId={workspace.id} projectCount={projects.length} />

      <div>
        <h2 className="text-foreground mb-3 text-sm font-semibold">โปรเจกต์ล่าสุด</h2>
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="ยังไม่มีโปรเจกต์"
            description="โปรเจกต์ใน Workspace นี้จะแสดงที่นี่"
            action={
              <Button size="sm" asChild>
                <Link href={`/w/${slug}/projects/new`}>สร้างโปรเจกต์แรก</Link>
              </Button>
            }
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

      <div>
        <h2 className="text-foreground mb-3 text-sm font-semibold">กิจกรรมล่าสุด</h2>
        <RecentActivitySection />
      </div>

      <div>
        <h2 className="text-foreground mb-3 text-sm font-semibold">ภาพรวม</h2>
        <WorkspaceAnalyticsSection workspaceId={workspace.id} />
      </div>
    </div>
  );
}
