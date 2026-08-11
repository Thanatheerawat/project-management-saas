import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { IssueDetailPanel } from "@/features/issue/components/issue-detail-panel";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";
import { issueRepository } from "@/repositories/issue/issue.repository";
import { projectRepository } from "@/repositories/workspace/project.repository";

export const metadata: Metadata = { title: "Issue Details — Orbit" };

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string; issueId: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound(); // defensive — the layout already gates this

  const { slug, projectId, issueId } = await params;
  const resolved = await resolveWorkspaceForRequest(slug, session.user.id);
  if (!resolved) notFound();

  const { workspace, membership } = resolved;

  const project = await projectRepository.findById(projectId);
  if (!project || project.workspaceId !== workspace.id) notFound();

  // Same enumeration-safe reasoning as the project detail page: an issue
  // that doesn't exist and one that exists under a *different* project
  // than the URL claims both 404 identically — the URL's projectId must
  // actually own this issue, not just any project in the caller's
  // workspace.
  const issue = await issueRepository.findById(issueId);
  if (!issue || issue.projectId !== project.id) notFound();

  const canManage = hasWorkspaceRole(membership.role, "ADMIN");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: workspace.name, href: `/w/${slug}` },
          { label: "Projects", href: `/w/${slug}/projects` },
          { label: project.name, href: `/w/${slug}/projects/${project.id}` },
          { label: "Issue" },
        ]}
      />

      <IssueDetailPanel
        issueId={issue.id}
        projectId={project.id}
        workspaceId={workspace.id}
        currentUserId={session.user.id}
        canModerateComments={canManage}
        canManageLabels={canManage}
      />
    </div>
  );
}
