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
      <PageContainer className="flex h-14 items-center justify-between gap-2">
        {/* min-w-0 lets this side shrink/truncate its content (e.g. a long
            workspace name) instead of forcing the row wider than the
            viewport — flex children default to a min-width equal to their
            content's intrinsic width, which is the actual mechanism behind
            unwanted horizontal scroll on narrow viewports here. */}
        <div className="flex min-w-0 items-center gap-2">{brand}</div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">{actions}</div>
      </PageContainer>
    </header>
  );
}
