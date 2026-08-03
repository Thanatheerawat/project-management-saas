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

## Issue tracking core (Milestone 4)

`Issue`, `Label`, `IssueLabel`, and `Comment` extend the Workspace/Project
model from Milestone 3 — see the Milestone 4 Decision Points (A–H) in
`docs/session-log.md` for the approved shape. A few points worth calling
out because they introduce patterns Milestone 2/3 didn't need:

- **`Project.key`** is a short uppercase prefix (e.g. `"ORB"`), derived
  from the project name by `deriveIssueKey()` (`src/lib/issue-key.ts`,
  pure function, same shape as `slugify()`) and unique **per workspace**
  (Decision Point B) — checked the same way `slug`/`name` collisions are
  (`findByWorkspaceAndKey` → `409 key_taken`), no auto-retry-with-suffix.
- **`Issue.number`** is a per-project sequence backed by
  `Project.issueCounter`, incremented inside the same
  `prisma.$transaction` that inserts the `Issue` row
  (`issueRepository.create`) — a single Postgres row-level
  `UPDATE x = x + 1` is what actually makes this safe under concurrent
  creates; the transaction only prevents a crash between the two
  statements from permanently skipping a number. The display key
  (`"ORB-123"`) is computed at the response layer
  (`toIssueResponse(issue, project.key)`) from `project.key` + `number`,
  never stored — same single-source-of-truth rule as every other response
  mapper.
- **`Issue.position`** is a `Float`, not an `Int`, so a future drag-and-drop
  increment can insert a card between two neighbors by computing a
  midpoint instead of renumbering the whole column. New issues are
  appended to the end of `BACKLOG` with a large constant gap (1000)
  computed server-side (`findMaxPositionInStatus` + gap) — drag-and-drop
  itself is deferred (Decision Point C); a status select/button is the
  interim status-change UI (Decision Point D covers the issue detail page
  being a full route, not a slide-over).
- **Labels are workspace-scoped, not project-scoped** (Decision Point F) —
  reusable across every project in the workspace, mirroring Linear's
  team-level label model. Creating a label definition is `ADMIN`+;
  attaching/detaching an existing label to an issue is `MEMBER`+ (it's
  triage work, not workspace structure). `IssueLabel` is a plain
  many-to-many join row with a composite primary key — no surrogate `id`,
  no separate response mapper (callers map through `label` →
  `toLabelResponse`).
- **Any `MEMBER`+ can edit any issue** (Decision Point G) — not gated to
  the reporter, the assignee, or `ADMIN`+; deleting an issue is still
  `ADMIN`+ only, matching Project delete's bar.
- **Comments**: the author can edit their own comment; the author or any
  `ADMIN`+ can delete it (Decision Point H, moderation without full edit
  rights).
- **Assignee validation has no FK to lean on** — `assigneeId` must be a
  member of the issue's workspace, which Prisma can't express as a
  foreign-key constraint (it would need to reference `WorkspaceMember`,
  not `User`, and only conditionally). `validateAssignee()`
  (`src/lib/auth/workspace-membership.ts`) checks it explicitly in both
  the issue-create and issue-update routes.
- **`resolveIssueContext(issueId, userId)`** (same file) is the Issue
  equivalent of `resolveWorkspaceMembership`/`resolveWorkspaceForRequest`:
  resolves issue → project → workspace membership in one call, returning
  `null` (→ 404, not 403) if any link is broken — extracted during the
  Milestone 4 cleanup pass after the same three-step block was duplicated
  across 8 route handlers.
- **Kanban board embeds labels in the Issue response** (Milestone 4
  Increment 5B) so the board loads with a single `GET
.../issues` request instead of one label fetch per card — every issue
  repository method includes the `labels` relation
  (`issueRepository`'s `WITH_LABELS` constant), and mutation hooks that
  touch labels (`useAttachLabel`/`useDetachLabel`) invalidate both
  `["issue", issueId]` and `["issues", projectId]`, not just
  `["issue-labels", issueId]`, so the board doesn't show stale labels
  after an attach/detach from the detail page.

## Dashboard & Analytics (Milestone 5)

Read-only aggregate views over the `Issue`/`Project`/`WorkspaceMember`
data that already exists after Milestone 4 — a workspace-level overview
(status/priority breakdown + team workload) and a project-level overview
(status/priority breakdown scoped to one project). No new tables, no new
permission tier: this milestone is purely a new way of looking at data
that Milestone 3/4 already made visible resource-by-resource.

**Decision Point A (trend/velocity data): A1 chosen.** A "completed this
week" chart would need a point-in-time signal for when an issue reached
`DONE`, but `Issue.updatedAt` is a whole-row timestamp bumped by _any_
edit (title, assignee, priority — not just status), so it can't be
trusted as a status-change timestamp without adding a new history table.
Rather than add that table (a real, if small, schema change) or ship an
inaccurate approximation, Milestone 5 ships **snapshot metrics only** —
status/priority/workload counts as they stand right now, no time-series
charts at all. This mirrors how Milestone 4's Decision Point E deferred
the Activity Feed entirely rather than half-building it; a minimal
`IssueStatusChange` table remains the natural on-ramp for a future
milestone that actually wants trend data, not something to retrofit here.

**Aggregation happens in the repository layer, not in a route handler or
in TypeScript.** Five new methods on the existing `issueRepository`
(`countByStatus`/`countByPriority`, scoped to a project, and
`countByStatusForWorkspace`/`countByPriorityForWorkspace`/
`countByAssigneeForWorkspace`, scoped across every project in a
workspace via the `Project` relation) are each a single Prisma
`groupBy(...)` with `_count: true` — Postgres does the counting via an
indexed aggregate query, reusing `Issue`'s existing
`@@index([projectId, status])` and `Project`'s existing
`@@index([workspaceId])`. No analytics-specific repository was added:
every metric is fundamentally an `Issue`-level grouping, so a separate
`analyticsRepository` would have split ownership of `Issue` queries
across two files for no real benefit — it stays on `issueRepository`,
consistent with the "one file per model" rule `repositories/` has
followed since Milestone 3.

**Response mappers zero-fill every enum value.** `toIssueBreakdownResponse`
(`features/analytics/issue-breakdown-response.ts`) takes the raw grouped
counts and produces `{ total, byStatus, byPriority }` with every
`IssueStatus`/`IssuePriority` present — including the ones with zero
issues — because "0 issues in CANCELLED" is real information a chart
needs, not a key to omit. It reads the canonical key order directly from
`ISSUE_STATUS_COLOR`/`ISSUE_PRIORITY_COLOR` (`constants/issue.ts`) rather
than hardcoding a second list, so chart iteration order automatically
matches the Kanban board's column order. `toWorkloadResponse`
(`workload-response.ts`) joins the grouped per-assignee counts against
the _full_ workspace member roster so a member with zero assigned issues
still appears (not silently dropped), and appends a `{ userId: null,
name: "Unassigned" }` bucket only when at least one issue genuinely has
no assignee — never as a permanent zero-row.

**API is three read-only `GET` endpoints**, no request body, no zod
schema: `GET /api/workspaces/[workspaceId]/analytics/overview`, `GET
/api/workspaces/[workspaceId]/analytics/workload`, and `GET
/api/projects/[projectId]/analytics/overview`. All three are `MEMBER`+
readable — a direct inheritance of Milestone 3's Decision Point 1 (every
workspace member already sees every project's issues individually, so an
aggregate of that same data introduces no new exposure) — and follow the
same enumeration-safe 404 pattern as every other route
(`requireWorkspaceAccess`/`resolveWorkspaceMembership`, unchanged from
Milestone 3/4).

**Recharts** (locked in the tech stack since Phase 4, unused in code
until now) renders three components — `StatusBreakdownChart`/
`PriorityBreakdownChart` (`Bar`/`Cell`, colored via
`ISSUE_STATUS_COLOR`/`ISSUE_PRIORITY_COLOR`, the same tokens the Kanban
board and priority badges already use — no second color definition) and
`WorkloadChart` (a horizontal bar chart, since Recharts' `layout="vertical"`
keeps member names legible regardless of count). `StatusBreakdownChart`/
`PriorityBreakdownChart` are generic (`data: Record<Status, number>` /
`Record<Priority, number>` props), so the same two components render at
both workspace and project scope — the workspace dashboard additionally
mounts `WorkloadChart`, which isn't meaningful at single-project scope.

**Freshness is `staleTime`-based, not invalidation-based — a deliberate
trade-off.** The three analytics TanStack Query hooks
(`useWorkspaceAnalyticsOverview`/`useWorkspaceWorkload`/
`useProjectAnalyticsOverview`, `features/analytics/hooks/`) use a 60
second `staleTime`, longer than the Kanban board's own queries, since a
dashboard is a glance-and-leave surface, not one requiring near-live
freshness. Issue/label mutation hooks (`useCreateIssue`, etc.) are
**not** modified to invalidate these query keys — doing so would
recompute a workspace-wide aggregate on every single-issue edit, which is
unnecessary churn for a summary view. A user sees updated numbers on
their next visit to the dashboard (or after the `staleTime` window
elapses), not instantly after an edit elsewhere. This is the same
"documented trade-off, not an oversight" discipline already used for the
WebSocket/queue decision earlier in this file.

## Current state

Milestone 2 (Identity & Access Management), Milestone 3 (Workspace &
Project Management Core), Milestone 4 (Issue Tracking Core), and
Milestone 5 (Dashboard & Analytics) are all implemented and covered by
unit, integration, and e2e tests. See the root [README.md](../README.md)
and [session-log.md](./session-log.md) for exact scope and what's still
designed-but-not-built (AI copilot, GitHub integration, drag-and-drop,
activity feed, trend/velocity charts — later milestones/deferred
decisions per the Development Plan).
