import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";

// Created now (not in Foundation) specifically because real pages exist
// underneath it — see docs/folder-structure.md's note on why this was
// deferred until there was something to render.
//
// Brand header + "Back to Orbit" link added: previously the only way back
// to "/" from /login or /register was the browser back button — no link
// existed anywhere on these pages (a real navigation gap, not a style
// preference).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background bg-dot-grid bg-hero-glow flex min-h-screen flex-col items-center justify-center bg-repeat px-4 py-10">
      <PageContainer className="flex w-full max-w-sm flex-col items-center gap-6">
        <Link href="/" className="text-foreground text-lg font-bold">
          Orbit
        </Link>
        <div className="border-border bg-surface w-full rounded-xl border p-6 shadow-sm">
          {children}
        </div>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← Back to Orbit
        </Link>
      </PageContainer>
    </div>
  );
}
