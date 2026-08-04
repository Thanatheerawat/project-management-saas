# Orbit

[![CI](https://github.com/Thanatheerawat/project-management-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/Thanatheerawat/project-management-saas/actions/workflows/ci.yml)

Project & issue tracker for software teams — Linear/Jira-style board with a
free-tier AI copilot for task breakdown. Built as a portfolio project for
Full Stack Software Engineer applications.

**🔗 Live Demo:** _Not yet deployed — a hosted demo link will go here._
<!-- Once deployed on Vercel: **[orbit-demo.vercel.app](https://orbit-demo.vercel.app)** -->

**Status: Milestone 6 (Admin Dashboard) shipped.** Milestones 2 (Identity &
Access Management), 3 (Workspace & Project Management Core), 4 (Task
Management Core / Issue Tracking), 5 (Dashboard & Analytics), and 6 (Admin
Dashboard) are all committed, tagged, and pushed (`v0.2.0`–`v0.6.0`). See
[docs/session-log.md](./docs/session-log.md) for the full decision-by-decision
history and [CHANGELOG.md](./CHANGELOG.md) for the release-by-release summary.

## Screenshots

_Coming soon._

<!--
| Kanban Board | Analytics Dashboard | Admin Dashboard |
| --- | --- | --- |
| ![Kanban board](./docs/screenshots/kanban-board.png) | ![Analytics dashboard](./docs/screenshots/analytics-dashboard.png) | ![Admin dashboard](./docs/screenshots/admin-dashboard.png) |
-->

## Features

Six milestones, each covered end to end by unit, integration, and e2e tests
(307 tests total as of `v0.6.0`):

- **Identity & Access** — register/login/logout, password reset, mock
  email verification, profile settings, platform-level RBAC
  (`USER`/`ADMIN`/`SUPER_ADMIN`)
- **Workspaces & Projects** — multi-tenant workspaces with
  slug-based URLs, workspace-level RBAC (`MEMBER`/`ADMIN`/`OWNER`),
  member management, projects scoped to a workspace
- **Issue Tracking** — Kanban board per project (Backlog → Todo → In
  Progress → In Review → Done → Cancelled), issue create/edit, status
  change, priority, assignee, workspace-scoped labels, comments — full
  RBAC parity between the UI and the API (see `docs/architecture.md`)
- **Dashboard & Analytics** — workspace-level status/priority breakdown
  and team workload charts, plus a per-project status/priority summary,
  built on Recharts and read entirely from indexed database aggregate
  queries (no data duplicated or precomputed)
- **Admin Dashboard** — platform-wide system overview (user/workspace/
  project counts + issue breakdown, reusing the same Analytics charts),
  paginated workspace and user management (role changes gated to
  `SUPER_ADMIN`, self-role-change/self-deactivation blocked outright),
  an audit log viewer, and a DB-reachability health check — the first
  real use of `PlatformRole` RBAC anywhere in the app

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Prisma 7 ·
PostgreSQL (Neon, via driver adapter) · next-auth v4 · TanStack Query ·
Zustand · Recharts · Groq (AI, free tier, mock-switchable) · Vercel

## Project Structure

Condensed view — see [Folder Structure](./docs/folder-structure.md) for the
full breakdown and the reasoning behind every folder.

```
src/
├── app/           # Routing only: pages, layouts, Route Handlers (incl. /admin)
├── features/      # Domain modules: auth, workspace, project, issue, analytics, admin
│   └── <feature>/ #   schemas/ (zod) · hooks/ (TanStack Query) · components/ · *-response.ts
├── repositories/  # The only layer allowed to call Prisma directly
├── components/
│   ├── ui/        # Generic design-system primitives (shadcn/ui)
│   └── layout/    # Navbar, Sidebar, Breadcrumb, PageContainer
├── lib/           # Cross-cutting helpers (prisma client, rbac, pagination, ...)
└── middleware.ts  # Auth-only route protection (role checks happen deeper)

tests/
├── integration/   # Route Handler tests against the real database (Vitest)
└── e2e/           # Full-browser tests against a production build (Playwright)
```

## Docs

- [Setup Guide](./docs/setup-guide.md) — get running locally
- [Architecture](./docs/architecture.md)
- [Folder Structure](./docs/folder-structure.md)
- [Coding Standards](./docs/coding-standards.md)
- [Development Guide](./docs/development-guide.md) — how to add a feature
- [Authentication Flow](./docs/auth-flow.md)
- [Security](./docs/security.md)
- [Architecture Decision Records](./docs/adr/README.md)
- [Session Log](./docs/session-log.md) — full project history and decisions
- [Changelog](./CHANGELOG.md)

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL and NEXTAUTH_SECRET
pnpm prisma generate
pnpm dev
```
