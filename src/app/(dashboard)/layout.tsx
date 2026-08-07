import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/features/user/components/user-menu";
import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/auth/rbac";

// Created now (not in Foundation) because a real page (/profile) exists
// underneath it. Reuses the same Navbar/PageContainer components the
// landing page already uses — see docs/folder-structure.md.
//
// Milestone 6 Increment 4: fetches the session here (every path under this
// group is already middleware-protected, so `session.user` is expected to
// exist) purely to decide whether to render the "Admin" link — UX only,
// same as `/w/[slug]/layout.tsx`'s equivalent addition. Real authorization
// still lives in `app/admin/layout.tsx` and every `/api/admin/*` route.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = !!session?.user && hasRole(session.user.role, "ADMIN");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        brand={<span className="text-foreground text-sm font-bold">Orbit</span>}
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
      <main className="flex-1">
        <PageContainer className="max-w-5xl py-10">{children}</PageContainer>
      </main>
    </div>
  );
}
