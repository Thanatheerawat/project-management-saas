import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/features/user/components/user-menu";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/auth/rbac";
import { resolveWorkspaceForRequest } from "@/lib/auth/workspace-membership";

// Deliberately NOT nested under (dashboard) — that group's layout.tsx
// already renders its own Navbar (used by /profile and /workspaces),
// and this layout renders a different one (with the workspace switcher +
// Sidebar). Nesting here would produce two Navbars. Route groups don't
// affect the URL, so this still needs its own such that /w/[slug] doesn't
// silently inherit chrome meant for the plain dashboard pages.
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login"); // defensive — middleware already covers /w (Increment 4)

  const { slug } = await params;
  const resolved = await resolveWorkspaceForRequest(slug, session.user.id);
  // notFound(), not redirect(): a non-member gets the exact same 404 a
  // nonexistent slug would, matching the Route Handlers' enumeration-safe
  // behavior (Increment 3) — nothing here reveals whether the workspace
  // exists to someone who isn't in it.
  if (!resolved) notFound();

  // Milestone 6 Increment 4: UX-only — shows the "Admin" link for
  // ADMIN/SUPER_ADMIN. Real authorization still lives in
  // `app/admin/layout.tsx` and every `/api/admin/*` route.
  const isAdmin = hasRole(session.user.role, "ADMIN");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        brand={<WorkspaceSwitcher name={resolved.workspace.name} />}
        actions={
          <>
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin">Admin</Link>
              </Button>
            )}
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />
      <div className="flex flex-1">
        <WorkspaceSidebar slug={slug} />
        <main className="flex-1">
          <PageContainer className="max-w-3xl py-10">{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
