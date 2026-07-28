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

## Two independent RBAC tiers (Milestone 2 + Milestone 3)

`PlatformRole` (`USER`/`ADMIN`/`SUPER_ADMIN`, `src/lib/auth/rbac.ts`) and
`WorkspaceRole` (`MEMBER`/`ADMIN`/`OWNER`, `src/lib/auth/workspace-rbac.ts`)
are deliberately separate checks, not a hierarchy — a platform `SUPER_ADMIN`
does **not** automatically gain access to a workspace's resources. Platform
role governs platform administration; workspace role governs access to a
specific `Workspace`'s data via the `WorkspaceMember` join row. Every
workspace/project Route Handler resolves membership first
(`resolveWorkspaceMembership`/`resolveWorkspaceForRequest`,
`src/lib/auth/workspace-membership.ts`) and returns 404 — never 403 — when
the caller isn't a member, so a non-member can't distinguish a workspace
that exists from one that doesn't (the same enumeration-safe pattern as
Milestone 2's forgot-password flow). A caller who **is** a member but lacks
the role for an action gets a normal 403, since they've already proven they
can see the resource.

## Workspace as the tenancy boundary (Milestone 3)

`Workspace` is the multi-tenancy unit; `Project` belongs to exactly one
workspace. Every workspace Member can see every project in that workspace
(no per-project membership model in this milestone — approved as Decision
Point 1 of the Milestone 3 proposal, see `docs/session-log.md`). Creating,
editing, or deleting a project requires `ADMIN`+ workspace role (Decision
Point 2). `Workspace.slug` is the public URL identifier
(`/w/[slug]`) — internal foreign keys always use the `id`, never the slug.

## Current state

Milestone 2 (Identity & Access Management) and Milestone 3 (Workspace &
Project Management Core) are both implemented and covered by unit,
integration, and e2e tests. See the root [README.md](../README.md) and
[session-log.md](./session-log.md) for exact scope and what's still
designed-but-not-built (task/issue tracking, AI copilot, GitHub
integration — later milestones per the Development Plan).
