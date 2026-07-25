# Orbit

Project & issue tracker for software teams — Linear/Jira-style board with a
free-tier AI copilot for task breakdown. Built as a portfolio project for
Full Stack Software Engineer applications.

**Status: Project Foundation phase.** No business logic yet — see
[docs/architecture.md](./docs/architecture.md) for what that means and why.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Prisma ·
PostgreSQL (Neon) · Auth.js · TanStack Query · Zustand · Recharts · Groq
(AI, free tier, mock-switchable) · Vercel

## Docs

- [Setup Guide](./docs/setup-guide.md) — get running locally
- [Architecture](./docs/architecture.md)
- [Folder Structure](./docs/folder-structure.md)
- [Coding Standards](./docs/coding-standards.md)
- [Development Guide](./docs/development-guide.md) — how to add a feature

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL / DIRECT_URL
pnpm prisma generate
pnpm dev
```
