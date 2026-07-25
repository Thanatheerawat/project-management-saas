# Setup Guide

## Requirements

- Node.js 22+ (`prisma.config.ts` uses the built-in `process.loadEnvFile`,
  available from Node 20.6/21.7, but 22+ is what this project is verified
  against)
- pnpm (`corepack enable` or `npm install -g pnpm`)
- A Neon Postgres project (free tier) — only needed from the Database
  milestone onward, but `DATABASE_URL` must exist for `prisma generate`
  to run today.

## First-time setup

```bash
pnpm install
cp .env.example .env
# fill in DATABASE_URL from your Neon project
pnpm prisma generate
pnpm dev
```

Open http://localhost:3000.

## Environment variables

See `.env.example` for the current full list with comments. As of the
Foundation phase, only `DATABASE_URL` is required — Auth/AI/Storage
variables are introduced in their own milestones.

Note: `prisma.config.ts` reads `.env` (not `.env.local`) via
`process.loadEnvFile()`, so connection strings must live there even
though Next.js itself would normally prefer `.env.local` for local
secrets.

## Common commands

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `pnpm dev`             | Start the dev server                           |
| `pnpm build`           | Production build                               |
| `pnpm lint`            | ESLint                                         |
| `pnpm typecheck`       | `tsc --noEmit`                                 |
| `pnpm test`            | Vitest (unit/component)                        |
| `pnpm test:e2e`        | Playwright                                     |
| `pnpm prisma generate` | Regenerate Prisma Client after a schema change |
