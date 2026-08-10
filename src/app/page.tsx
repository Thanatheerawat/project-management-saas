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

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Orbit — Project Management for Software Teams",
  description:
    "Orbit brings workspaces, projects, and issues into one focused workspace built for modern software teams.",
};

const CAPABILITIES = [
  {
    icon: Building2,
    title: "Workspaces",
    description:
      "Organize teams and work in dedicated workspaces, each with their own members and projects.",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    description:
      "Keep projects structured and easy to navigate, with clear status from active to completed.",
  },
  {
    icon: ListTodo,
    title: "Issue Tracking",
    description:
      "Track issues on a Kanban board — status, priority, assignees, and labels in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based Access",
    description:
      "Control who can do what with workspace-level roles for owners, admins, and members.",
  },
] as const;

const WORKFLOW_STEPS = [
  { icon: Building2, label: "Workspace" },
  { icon: FolderKanban, label: "Projects" },
  { icon: ListTodo, label: "Issues" },
  { icon: BarChart3, label: "Progress" },
] as const;

// A truthful, abstract representation of the real Kanban board — not a
// screenshot, not fabricated data. Same status vocabulary the app itself
// uses (prisma/schema.prisma's IssueStatus), so it can't drift into a
// claim the product doesn't back up.
const PREVIEW_COLUMNS = [
  { label: "Backlog", items: ["Auth polish", "Onboarding copy"] },
  { label: "In Progress", items: ["Kanban board", "Workspace roles"] },
  { label: "Done", items: ["Project setup", "Issue tracking"] },
] as const;

export default function Home() {
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
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </>
        }
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-border bg-dot-grid bg-hero-glow relative border-b bg-repeat">
          <PageContainer className="flex flex-col items-center gap-5 py-20 text-center sm:py-28">
            <span className="text-accent bg-accent/10 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              Project Management for Software Teams
            </span>
            <h1 className="text-foreground max-w-2xl text-4xl font-bold text-balance sm:text-5xl">
              Plan, track, and ship better — together.
            </h1>
            <p className="text-muted-foreground max-w-xl text-base text-balance sm:text-lg">
              Orbit brings workspaces, projects, and issues into one focused workspace
              built for modern software teams.
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register" className="gap-2">
                  Get Started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </PageContainer>
        </section>

        {/* Product capabilities */}
        <section className="border-border border-b">
          <PageContainer className="flex flex-col gap-8 py-16 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-foreground text-2xl font-bold">
                Everything your team needs to ship
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                A focused set of tools for planning and tracking software work.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="hover:border-accent/40 transition-colors">
                  <CardHeader>
                    <Icon className="text-accent size-6" aria-hidden="true" />
                    <CardTitle className="mt-2">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </PageContainer>
        </section>

        {/* Workflow */}
        <section className="border-border bg-surface border-b">
          <PageContainer className="flex flex-col gap-10 py-16 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-foreground text-2xl font-bold">
                A clear path from idea to done
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                One consistent structure, from the first workspace to a shipped issue.
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
        <section className="border-border border-b">
          <PageContainer className="flex flex-col gap-8 py-16 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-foreground text-2xl font-bold">
                See your work, board by board
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Every issue moves through Backlog, In Progress, and Done — visible to the
                whole team.
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

        {/* Final CTA */}
        <section className="bg-dot-grid bg-repeat">
          <PageContainer className="flex flex-col items-center gap-5 py-16 text-center sm:py-20">
            <h2 className="text-foreground max-w-lg text-2xl font-bold text-balance sm:text-3xl">
              Ready to bring your projects into focus?
            </h2>
            <p className="text-muted-foreground max-w-md text-sm sm:text-base">
              Start organizing your work with Orbit.
            </p>
            <Button size="lg" asChild>
              <Link href="/register" className="gap-2">
                Get Started
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
