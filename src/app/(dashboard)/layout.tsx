import { Navbar } from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/features/user/components/user-menu";

// Created now (not in Foundation) because a real page (/profile) exists
// underneath it. Reuses the same Navbar/PageContainer components the
// landing page already uses — see docs/folder-structure.md.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        brand={<span className="text-foreground text-sm font-bold">Orbit</span>}
        actions={
          <>
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />
      <main className="flex-1">
        <PageContainer className="max-w-2xl py-10">{children}</PageContainer>
      </main>
    </div>
  );
}
