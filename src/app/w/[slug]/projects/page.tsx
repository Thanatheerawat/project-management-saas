import { FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { projectRepository } from "@/repositories/workspace/project.repository";

export const metadata: Metadata = { title: "โปรเจกต์ — Orbit" };

// Read-only list via the repository directly (same SSR pattern as the
// dashboard shell) — every workspace Member can see every project
// (Decision Point 1, approved in the Milestone 3 proposal), so there's no
// role gate on the list itself, only on the "Create Project" action.
export default async function ProjectsPage({
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
  const canCreate = hasWorkspaceRole(membership.role, "ADMIN");
  const projects = await projectRepository.findManyByWorkspace(workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-foreground text-xl font-bold">โปรเจกต์</h1>
        {canCreate && (
          <Button asChild size="sm">
            <Link href={`/w/${slug}/projects/new`}>สร้างโปรเจกต์</Link>
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="ยังไม่มีโปรเจกต์"
          description="โปรเจกต์ใน Workspace นี้จะแสดงที่นี่"
          action={
            canCreate ? (
              <Button asChild size="sm">
                <Link href={`/w/${slug}/projects/new`}>สร้างโปรเจกต์แรก</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/w/${slug}/projects/${project.id}`}>
              <Card size="sm" className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{project.name}</CardTitle>
                    <Badge variant="outline">{project.status}</Badge>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
