# Orbit

Project & issue tracker for software teams — Linear/Jira-style board with a
free-tier AI copilot for task breakdown. Built as a portfolio project for
Full Stack Software Engineer applications.

**Status: Milestone 4 (Task Management Core / Issue Tracking) code-complete,
not yet committed.** Milestones 2 (Identity & Access Management) and 3
(Workspace & Project Management Core) are committed, tagged, and pushed
(`v0.2.0`, `v0.3.0`). Milestone 4 adds a Kanban-style issue tracker (Issue/
Label/Comment) on top of the Workspace/Project core — implemented,
manually verified, and covered by unit, integration, and e2e tests, but
still awaiting the final review/commit/tag (`v0.4.0`) pass. See
[docs/session-log.md](./docs/session-log.md) for full history.

## Features

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

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Prisma 7 ·
PostgreSQL (Neon, via driver adapter) · next-auth v4 · TanStack Query ·
Zustand · Recharts · Groq (AI, free tier, mock-switchable) · Vercel

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
