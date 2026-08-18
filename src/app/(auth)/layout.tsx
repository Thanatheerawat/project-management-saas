import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Footer } from "@/components/layout/footer";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PageContainer } from "@/components/layout/page-container";

// Created now (not in Foundation) specifically because real pages exist
// underneath it — see docs/folder-structure.md's note on why this was
// deferred until there was something to render.
//
// Brand header + "Back to Orbit" link added: previously the only way back
// to "/" from /login or /register was the browser back button — no link
// existed anywhere on these pages (a real navigation gap, not a style
// preference).
//
// M6.5 finalization: added the same Footer the landing page uses (brand +
// tagline + copyright, no new links) so the auth pages read as the same
// product as "/" instead of a bare, disconnected form — and switched the
// card's flat shadow-sm for a faint accent-tinted ring, matching the
// portfolio-inspired "restrained glow" direction already used on
// .bg-hero-glow.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");

  return (
    <div className="bg-background bg-dot-grid bg-hero-glow flex min-h-screen flex-col bg-repeat">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <PageContainer className="flex w-full max-w-sm flex-col items-center gap-6">
          {/* M6.6 Increment 3B: this layout has no Navbar/actions-slot the
              way every other layout does, so the switcher gets its own
              row instead — alwaysVisible for the same reason the public
              Navbar needs it (no mobile drawer/menu to fall back into
              below `md`). Right-aligned above the brand link rather than
              centered with it, matching the top-right placement the
              switcher already has everywhere else in the app. */}
          <div className="flex w-full justify-end">
            <LanguageSwitcher alwaysVisible />
          </div>
          <Link href="/" className="text-foreground text-lg font-bold">
            Orbit
          </Link>
          <div className="border-border bg-surface ring-accent/5 w-full rounded-xl border p-6 shadow-lg ring-1">
            {children}
          </div>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("backToOrbit")}
          </Link>
        </PageContainer>
      </div>
      <Footer />
    </div>
  );
}
