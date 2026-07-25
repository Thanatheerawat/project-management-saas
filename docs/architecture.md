# Architecture

Condensed reference for the repo. Full design rationale lives in the Product
Vision, System Design, UI/UX, and Development Plan documents produced before
any code was written; this file is the version that travels with the code.

## Shape

Orbit is a single Next.js (App Router) application — not a monorepo, not a
separate backend service. Frontend pages and backend API logic (Route
Handlers) live in the same deployable unit and ship together to Vercel.

```
Browser ── Next.js (Vercel) ──┬── Route Handlers ── Prisma ── Neon Postgres
                               ├── Auth.js (session)
                               ├── Groq API / Mock provider (AI)
                               └── Cloudinary (file storage)
```

## Why this shape, not the original System Design doc's shape

The original System Design doc assumed a NestJS backend with a separate
worker process, a WebSocket gateway, Redis, and Fly.io deployment. Once the
tech stack was locked to **Next.js Route Handlers on Vercel only**, that
shape no longer fits — Vercel functions are stateless and short-lived, with
no place to run a persistent worker or hold a WebSocket connection open.
Two adjustments follow directly from that constraint:

- **No queue / worker process.** AI generation calls the provider directly
  from a Route Handler using a streaming response. The call is slow (seconds,
  not milliseconds) but still bounded — well within what a single request
  can hold open — so a queue adds infrastructure without solving a real
  problem at this scale.
- **No WebSocket gateway.** Real-time board sync uses TanStack Query
  polling/revalidation instead of a push connection. This is a deliberate
  MVP trade-off, not an oversight — documented here so it isn't
  "rediscovered" and re-litigated later.

## Prisma 7: connection wiring changed mid-Foundation

`prisma` resolved to v7.9.0 on install, which removed `url`/`directUrl`
from `schema.prisma` entirely. The new setup, adopted as part of the
existing Prisma + Neon stack (not a stack change):

- **`prisma.config.ts`** (repo root) — CLI-facing config (`generate`,
  `migrate`, `studio`). Loads `.env` itself via `process.loadEnvFile()`
  since Prisma 7's config loader no longer sources it automatically.
- **`src/lib/prisma.ts`** — runtime `PrismaClient`, constructed with a
  `PrismaNeon` driver adapter (`@prisma/adapter-neon`) instead of a plain
  connection string.
- **No `DIRECT_URL` anymore.** The Neon adapter queries over HTTP, which
  sidesteps the prepared-statement limitation that made a separate
  non-pooled connection necessary for migrations under the old
  classic-TCP Prisma+Neon setup.
- **Generated client output moved.** `generator client` now uses the
  `prisma-client` provider (the new default, replacing `prisma-client-js`)
  with `output = "../src/generated/prisma"` — imported from
  `@/generated/prisma/client`, not `@prisma/client` directly. This folder
  is gitignored and regenerated via `pnpm prisma generate`.

## Layering rule

Route Handlers stay thin (parse request → call a feature/service/repository
function → return response). Business logic does not live in `app/`. See
[folder-structure.md](./folder-structure.md) for where it does live and why.

## Current state

Foundation phase only: no database models, no auth, no business logic yet.
See the root [README.md](../README.md) for what's actually implemented today
versus what's designed-but-not-built.
