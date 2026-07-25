import { PageContainer } from "@/components/layout/page-container";

interface NavbarProps {
  brand: React.ReactNode;
  actions?: React.ReactNode;
}

// Generic top bar: takes a brand slot and an actions slot rather than
// hardcoding org-switcher/search/notifications — those are real Workspace
// features (Milestone 4+), not Foundation. The same component serves the
// landing page today and the dashboard chrome later, just with different
// children.
export function Navbar({ brand, actions }: NavbarProps) {
  return (
    <header className="border-border bg-surface border-b">
      <PageContainer className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">{brand}</div>
        <div className="flex items-center gap-2">{actions}</div>
      </PageContainer>
    </header>
  );
}
