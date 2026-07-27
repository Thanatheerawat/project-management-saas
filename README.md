# Orbit

Project & issue tracker for software teams — Linear/Jira-style board with a
free-tier AI copilot for task breakdown. Built as a portfolio project for
Full Stack Software Engineer applications.

**Status: Milestone 2 (Identity & Access Management) complete.**
Register/login/logout, password reset, mock email verification, and
profile settings are implemented, migrated on Neon, and verified — unit,
integration, and e2e tests all pass, alongside a full manual verification
pass. See [docs/session-log.md](./docs/session-log.md) for full history.

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
