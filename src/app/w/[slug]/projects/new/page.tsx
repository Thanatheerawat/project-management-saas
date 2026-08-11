import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreateProjectForm } from "@/features/project/components/create-project-form";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";

export const metadata: Metadata = { title: "สร้างโปรเจกต์ — Orbit" };

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
          สร้างโปรเจกต์
        </h1>
        <p className="text-muted-foreground text-sm">
          เฉพาะ Owner หรือ Admin เท่านั้นที่สร้างโปรเจกต์ได้
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        สร้างโปรเจกต์ใหม่
      </h1>
      <CreateProjectForm workspaceId={workspace.id} slug={slug} />
    </div>
  );
}
