import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WorkspacePicker } from "@/features/workspace/components/workspace-picker";
import { auth } from "@/lib/auth/auth";
import { workspaceMemberRepository } from "@/repositories/workspace/workspace-member.repository";

export const metadata: Metadata = { title: "เลือก Workspace — Orbit" };

// Workspace Resolution step of the approved User Flow: 0 workspaces →
// picker renders its own empty state; exactly 1 → skip the picker
// entirely (less friction); 2+ → render the picker. The redirect decision
// needs a DB read, so it happens here (a Server Component), not in
// middleware — middleware only knows "logged in or not" (Increment 4).
export default async function WorkspacesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login"); // defensive — middleware already covers this path

  const memberships = await workspaceMemberRepository.findManyForUser(session.user.id);
  if (memberships.length === 1) {
    redirect(`/w/${memberships[0].workspace.slug}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        Workspace ของคุณ
      </h1>
      <WorkspacePicker />
    </div>
  );
}
