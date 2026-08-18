import {
  ArrowRight,
  BarChart3,
  Building2,
  FolderKanban,
  ListTodo,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Footer } from "@/components/layout/footer";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Navbar } from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Reuses `landing.eyebrow`/`landing.heroDescription` rather than adding
// new metadata-only keys — both are already the exact visible copy this
// page's own hero renders, so a separate key would just be a second
// string to keep in sync (Increment 3D scope decision).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");

  return {
    title: `Orbit — ${t("eyebrow")}`,
    description: t("heroDescription"),
  };
}

export default async function Home() {
  // No namespace argument: this page needs both `landing.*` (its own
  // copy) and `navigation.workspace`/`navigation.projects` (reused for
  // two of the four workflow labels, per the audit's dedupe finding), so
  // a single translator scoped to the whole message tree is simpler than
  // two separate `getTranslations()` calls.
  const t = await getTranslations();

  const CAPABILITIES = [
    {
      icon: Building2,
      title: t("landing.capabilities.workspaces.title"),
      description: t("landing.capabilities.workspaces.description"),
    },
    {
      icon: FolderKanban,
      title: t("landing.capabilities.projects.title"),
      description: t("landing.capabilities.projects.description"),
    },
    {
      icon: ListTodo,
      title: t("landing.capabilities.issueTracking.title"),
      description: t("landing.capabilities.issueTracking.description"),
    },
    {
      icon: ShieldCheck,
      title: t("landing.capabilities.roleBasedAccess.title"),
      description: t("landing.capabilities.roleBasedAccess.description"),
    },
  ] as const;

  const WORKFLOW_STEPS = [
    { icon: Building2, label: t("navigation.workspace") },
    { icon: FolderKanban, label: t("navigation.projects") },
    { icon: ListTodo, label: t("landing.workflow.issues") },
    { icon: BarChart3, label: t("landing.workflow.progress") },
  ] as const;

  // A truthful, abstract representation of the real Kanban board — not a
  // screenshot, not fabricated data. Same status vocabulary the app
  // itself uses (prisma/schema.prisma's IssueStatus), so it can't drift
  // into a claim the product doesn't back up. Column labels and item
  // titles are all authored marketing/demo copy (no real user content),
  // so — unlike the real IssueStatus enum values elsewhere in the app —
  // they translate freely; there is no wire/DB value being displayed
  // here for these particular strings to stay in sync with.
  const PREVIEW_COLUMNS = [
    {
      label: t("landing.previewColumns.backlog"),
      items: [
        t("landing.previewItems.authPolish"),
        t("landing.previewItems.onboardingCopy"),
      ],
    },
    {
      label: t("landing.previewColumns.inProgress"),
      items: [
        t("landing.previewItems.kanbanBoard"),
        t("landing.previewItems.workspaceRoles"),
      ],
    },
    {
      label: t("landing.previewColumns.done"),
      items: [
        t("landing.previewItems.projectSetup"),
        t("landing.previewItems.issueTracking"),
      ],
    },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        brand={
          <Link href="/" className="text-foreground text-sm font-bold">
            Orbit
          </Link>
        }
        actions={
          <>
            {/* alwaysVisible: the public Navbar has no mobile drawer/menu
                for the switcher to fall back into below `md` the way the
                authenticated layouts' UserMenu does — see
                language-switcher.tsx's own comment. */}
            <LanguageSwitcher alwaysVisible />
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t("landing.signIn")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">{t("landing.getStarted")}</Link>
            </Button>
          </>
        }
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-dot-grid bg-hero-glow relative bg-repeat">
          <PageContainer className="flex flex-col items-center gap-5 py-24 text-center sm:py-32">
            <span className="text-accent bg-accent/10 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              {t("landing.eyebrow")}
            </span>
            <h1 className="text-foreground max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              {t.rich("landing.heroHeading", {
                accent: (chunks) => <span className="text-accent">{chunks}</span>,
              })}
            </h1>
            <p className="text-muted-foreground max-w-xl text-base text-balance sm:text-lg">
              {t("landing.heroDescription")}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register" className="gap-2">
                  {t("landing.getStarted")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">{t("landing.signIn")}</Link>
              </Button>
            </div>
          </PageContainer>
        </section>

        {/* Product capabilities */}
        <section>
          <PageContainer className="flex flex-col gap-8 py-16 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-foreground text-2xl font-bold tracking-tight">
                {t("landing.capabilitiesHeading")}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                {t("landing.capabilitiesDescription")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map(({ icon: Icon, title, description }) => (
                <Card
                  key={title}
                  className="hover:border-accent/40 hover:shadow-accent/5 transition-all hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="bg-accent/10 flex size-10 items-center justify-center rounded-lg">
                      <Icon className="text-accent size-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="mt-2">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </PageContainer>
        </section>

        {/* Workflow */}
        <section className="bg-surface">
          <PageContainer className="flex flex-col gap-10 py-16 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-foreground text-2xl font-bold tracking-tight">
                {t("landing.workflowHeading")}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                {t("landing.workflowDescription")}
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-2">
              {WORKFLOW_STEPS.map(({ icon: Icon, label }, index) => (
                <div key={label} className="flex items-center gap-2 sm:gap-4">
                  <div className="border-border bg-background hover:border-accent/40 flex flex-col items-center gap-2 rounded-xl border px-6 py-4 transition-colors">
                    <Icon className="text-accent size-5" aria-hidden="true" />
                    <span className="text-foreground text-sm font-medium">{label}</span>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <ArrowRight
                      className="text-faint size-4 rotate-90 sm:rotate-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
          </PageContainer>
        </section>

        {/* Product preview — an abstract representation of the real Kanban
            board, built from the same UI primitives and status vocabulary
            the app actually uses. Not a screenshot, not fabricated data. */}
        <section>
          <PageContainer className="flex flex-col gap-8 py-16 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-foreground text-2xl font-bold tracking-tight">
                {t("landing.previewHeading")}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                {t("landing.previewDescription")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PREVIEW_COLUMNS.map((column) => (
                <div
                  key={column.label}
                  className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-sm font-semibold">
                      {column.label}
                    </span>
                    <Badge variant="outline">{column.items.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {column.items.map((item) => (
                      <div
                        key={item}
                        className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PageContainer>
        </section>

        {/* Final CTA — bookends the hero with the same dot-grid + glow
            texture, so the page opens and closes on the same visual note. */}
        <section className="bg-dot-grid bg-hero-glow border-border border-t bg-repeat">
          <PageContainer className="flex flex-col items-center gap-5 py-16 text-center sm:py-20">
            <h2 className="text-foreground max-w-lg text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              {t("landing.finalCtaHeading")}
            </h2>
            <p className="text-muted-foreground max-w-md text-sm sm:text-base">
              {t("landing.finalCtaDescription")}
            </p>
            <Button size="lg" asChild>
              <Link href="/register" className="gap-2">
                {t("landing.getStarted")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </PageContainer>
        </section>
      </main>

      <Footer />
    </div>
  );
}
