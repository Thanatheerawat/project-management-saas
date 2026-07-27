import { PageContainer } from "@/components/layout/page-container";

// Created now (not in Foundation) specifically because real pages exist
// underneath it — see docs/folder-structure.md's note on why this was
// deferred until there was something to render.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <PageContainer className="w-full max-w-sm">
        <div className="border-border bg-surface rounded-lg border p-6 shadow-sm">
          {children}
        </div>
      </PageContainer>
    </div>
  );
}
