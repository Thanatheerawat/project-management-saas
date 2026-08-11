import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AddMemberForm } from "@/features/workspace/components/add-member-form";
import { MemberList } from "@/features/workspace/components/member-list";
import { auth } from "@/lib/auth/auth";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";
import { hasWorkspaceRole } from "@/lib/auth/workspace-rbac";

export const metadata: Metadata = { title: "สมาชิก — Orbit" };

export default async function WorkspaceMembersPage({
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
  const canManage = hasWorkspaceRole(membership.role, "ADMIN");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">สมาชิก</h1>

      {canManage && <AddMemberForm workspaceId={workspace.id} />}

      <MemberList
        workspaceId={workspace.id}
        currentUserId={session.user.id}
        canManage={canManage}
      />
    </div>
  );
}
