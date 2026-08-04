import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/features/user/components/user-menu";
import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/auth/rbac";

// Deliberately NOT nested under (dashboard) — same reasoning as
// `/w/[slug]/layout.tsx`: that group's layout already renders its own
// Navbar, and this one needs its own admin-branded chrome. Route groups
// don't affect the URL, so `/admin` still needs its own top-level layout.
//
// Decision A2: a non-admin gets redirect("/profile"), not notFound().
// Unlike `/w/[slug]` (where hiding whether a workspace exists is the
// point), `/admin` has nothing to hide from a plain USER — they already
// know the platform has an admin area, so a plain redirect is enough.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login"); // defensive — middleware already covers /admin (Increment 4)

  if (!hasRole(session.user.role, "ADMIN")) redirect("/profile");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        brand={<span className="text-foreground text-sm font-bold">Orbit Admin</span>}
        actions={
          <>
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />
      <main className="flex-1">
        <PageContainer className="max-w-5xl py-10">{children}</PageContainer>
      </main>
    </div>
  );
}
