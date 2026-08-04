# Folder Structure

```
src/
├── app/                # Routing only: pages, layouts, Route Handlers
├── components/
│   ├── ui/              # Generic design-system primitives (shadcn/ui)
│   └── layout/           # Navbar, Sidebar, Footer, Breadcrumb, PageContainer
├── features/            # Domain modules (auth, workspace, issues, ai, ...)
├── lib/                 # Cross-cutting technical helpers (prisma client, cn(), logger)
├── hooks/               # Generic hooks not tied to one feature
├── services/            # Thin clients wrapping external APIs (Groq, Cloudinary)
├── repositories/        # The only layer allowed to write Prisma queries directly
├── types/               # Types shared across ≥2 features
├── constants/           # App-wide fixed values (status labels, role order)
├── config/              # env parsing, site/nav config — "how the app is wired"
├── providers/           # React Context providers, composed once for root layout
├── styles/              # Truly global CSS only (Tailwind lives inline in components)
└── middleware.ts        # Fixed Next.js location
```

## Why each folder exists

| Folder                                | Reason                                                                                                                                                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/`                                | Next.js convention. Kept thin on purpose: route handlers call into `features/`/`services/`/`repositories/` so routing stays independent of business logic and is easy to read at a glance.                                                                                                                   |
| `components/ui/`                      | Generic, no business meaning — reusable in any feature. This is where shadcn/ui components live after being restyled with Orbit's tokens.                                                                                                                                                                    |
| `components/layout/`                  | Page chrome, not design-system primitives — kept separate from `ui/` because it's structural, not reusable outside the app shell.                                                                                                                                                                            |
| `features/`                           | Mirrors the module boundaries from the System Design doc (what used to be separate NestJS modules), just living inside one Next.js app. Each feature colocates its own components/hooks/services/schemas — easy to reason about ownership, easy to extract later if it ever needs to become its own service. |
| `lib/`                                | Framework glue and technical helpers with no business meaning — used everywhere, owned by no feature.                                                                                                                                                                                                        |
| `hooks/`                              | Only for hooks generic enough to apply anywhere (`useDebounce`, `useMediaQuery`). Feature-specific hooks live inside that feature's own folder instead, so this one doesn't become a junk drawer.                                                                                                            |
| `services/`                           | The only place external SDKs (Groq, Cloudinary) get imported. One point to swap a provider — matches the AI provider abstraction (`AI_PROVIDER=mock\|groq`) from the Development Plan.                                                                                                                       |
| `repositories/`                       | The only layer allowed to call `prisma.*` directly. Route handlers and features call a repository function instead of writing queries inline — centralizes query logic, makes it testable in isolation, and means swapping the ORM later wouldn't touch business logic.                                      |
| `types/`                              | Only for types used by more than one feature. A type used by exactly one feature lives with that feature instead.                                                                                                                                                                                            |
| `constants/`                          | Single source of truth for fixed domain values (status colors/labels, role hierarchy) — avoids magic strings scattered across the codebase.                                                                                                                                                                  |
| `config/`                             | Distinct from `constants/`: this is "how the app is wired" (env validation, nav structure), not "fixed domain values."                                                                                                                                                                                       |
| `providers/`                          | Every app-wide Context provider composed once, in one file, so `layout.tsx` stays readable and each provider can be tested/swapped independently.                                                                                                                                                            |
| `styles/`                             | Reserved for styles that must be truly global (font-face, base resets) — component styling stays as inline Tailwind classes, not here.                                                                                                                                                                       |
| `middleware.ts`                       | Next.js requires this exact location. Real route protection as of Milestone 2 (see [architecture.md](./architecture.md)) — no longer a pass-through.                                                                                                                                                         |
| `docs/` (repo root, not under `src/`) | Documents the whole repo, not runtime code — doesn't belong inside the app source tree.                                                                                                                                                                                                                      |

## `(auth)` / `(dashboard)` route groups

Foundation deliberately did not include `src/app/(auth)/layout.tsx` or
`src/app/(dashboard)/layout.tsx` — a Next.js `layout.tsx` only ever renders
if a `page.tsx` exists somewhere under it, and neither existed yet. Both
were added in Milestone 2 alongside their first real pages (login/register/
forgot-password/reset-password/verify-email under `(auth)`, profile under
`(dashboard)`), reusing the Navbar/Footer/PageContainer/ThemeToggle
components that already existed in `components/layout/`.

## `app/w/[slug]/` — a top-level segment, not nested under `(dashboard)`

Added in Milestone 3. `(dashboard)/layout.tsx` renders its own Navbar (used
by `/profile` and `/workspaces`); `w/[slug]/layout.tsx` renders a different
one (workspace switcher + `Sidebar`, now actually mounted via
`WorkspaceSidebar`). Nesting `w/` under `(dashboard)` would render two
Navbars, so it's a sibling top-level segment instead — route groups don't
affect the URL, so this doesn't change `/w/[slug]` itself. The layout does
the membership check once per request (`resolveWorkspaceForRequest`,
wrapped in React's `cache()` so the layout and page don't double-query for
the same request) and calls `notFound()` — not `redirect()` — for both a
nonexistent slug and one the caller isn't a member of.

Pages under this segment: `page.tsx` (dashboard shell — also mounts the
Kanban board's parent, see below), `settings/page.tsx`, `members/page.tsx`,
`projects/page.tsx` (list), `projects/new/page.tsx`,
`projects/[projectId]/page.tsx` (detail — renders the project's Kanban
board, added Milestone 4), `projects/[projectId]/edit/page.tsx`, and
`projects/[projectId]/issues/[issueId]/page.tsx` (issue detail — added
Milestone 4, a full page per Decision Point D, not a slide-over/intercepting
route). Each of the ADMIN+-gated pages (settings edit, project create/edit,
label creation) does its own page-level role check for UX (showing a
read-only view or a message instead of a form that would 403 on submit) —
the actual enforcement is server-side in the Route Handler either way.

## `features/workspace/` and `features/project/`

Milestone 3's domain modules, following the same shape as `features/auth/`
and `features/user/`: `schemas/` (zod, shared between client forms and
Route Handlers), `hooks/` (TanStack Query, one file per query/mutation),
`components/` (client-side forms and lists), plus a `*-response.ts` per
resource (`toWorkspaceResponse`/`toProjectResponse`/
`toWorkspaceMemberResponse`) — the single mapper every Route Handler for
that resource uses, so list/create/detail/update endpoints can't drift into
returning different field sets for the same resource.

## `features/issue/` (Milestone 4)

Same shape as `features/workspace/`, covering three resources at once
(`Issue`, `Label`, `Comment` — `IssueLabel` is a join table with no
dedicated response mapper, see `architecture.md`):

- `schemas/` — `create-issue`, `update-issue`, `create-label`,
  `update-label`, `attach-label`, `create-comment` (reused for comment
  edit — a comment has exactly one editable field, so there's no
  partial-update shape distinct from create).
- `hooks/` — 16 files, one per query/mutation, grouped by resource
  (`use-issue*`, `use-label*`, `use-issue-labels`/`use-attach-label`/
  `use-detach-label` for the join, `use-comment*`). Unlike
  `features/project/`'s hooks (which don't invalidate — that page is a
  Server Component reading straight from the repository), every Issue/
  Label/Comment mutation hook calls `invalidateQueries`, because the
  Kanban board is a client-rendered, frequently-interacted-with surface.
- `components/` — `kanban-board.tsx`/`kanban-column.tsx`/`issue-card.tsx`
  (the board itself), `create-issue-dialog.tsx`, `edit-issue-form.tsx`,
  `issue-status-select.tsx` (instant-apply, the status-change control that
  substitutes for deferred drag-and-drop), `issue-label-section.tsx`,
  `comment-section.tsx`, `issue-detail-panel.tsx` (the client orchestrator
  that calls `useIssue()` once and threads the result to the components
  above).
- `issue-response.ts`, `label-response.ts`, `comment-response.ts` — one
  mapper per resource, same rule as `workspace-response.ts`/
  `project-response.ts`. `toCommentResponse` never spreads the full
  `User` row for `author` (keeps `passwordHash` from ever reaching a
  client), mirroring `toWorkspaceMemberResponse`.

## `repositories/issue/`

One file per model, same convention as `repositories/workspace/`:
`issue.repository.ts`, `label.repository.ts`, `comment.repository.ts`,
`issue-label.repository.ts` (the join table — added in Increment 4, once
label-assignment endpoints existed to call it; deliberately not created
alongside the other three in Increment 2, since an unused repository would
be scaffolding ahead of need). `issue.repository.ts`'s `create()` wraps two
statements in `prisma.$transaction` (increment `Project.issueCounter`, then
insert the `Issue` with that number) rather than the nested-create pattern
`workspaceRepository.createWithOwner` uses, since the `Project` here
already exists rather than being created in the same call. Milestone 5
added five aggregation methods here (`countByStatus`/`countByPriority`
scoped to a project, and their `...ForWorkspace` counterparts scoped
across a whole workspace) rather than a new `analyticsRepository` — see
`architecture.md`'s "Dashboard & Analytics" section for why.

## `constants/`

First real use as of Milestone 4 (`constants/issue.ts`) — the folder was
reserved since Foundation but had nothing to hold until status/priority
colors needed a single source of truth. `ISSUE_STATUS_COLOR`/
`ISSUE_PRIORITY_COLOR` map each enum value to the CSS custom property
locked in `globals.css` since the Phase 3 UI/UX doc, referenced via inline
`style` (not a Tailwind class) because the color is chosen dynamically per
issue — Tailwind's JIT compiler can't pick up a class name built from
string interpolation.

## `features/analytics/` (Milestone 5)

Same shape as `features/workspace/`/`features/issue/`, but read-only —
no `schemas/` folder, since every endpoint is a `GET` with no request
body to validate:

- `hooks/` — `use-workspace-analytics-overview.ts` (also declares the
  shared `IssueBreakdownResponse` type, since the workspace and project
  overview endpoints return the identical shape),
  `use-project-analytics-overview.ts` (imports that same type rather than
  redeclaring it), `use-workspace-workload.ts`. All three are
  query-only — no mutations, no `invalidateQueries` wiring from other
  features' hooks (see `architecture.md`'s "Dashboard & Analytics"
  section for why that's deliberate).
- `components/` — `status-breakdown-chart.tsx`/`priority-breakdown-chart.tsx`
  (generic, shared between workspace and project scope),
  `workload-chart.tsx` (workspace-scope only), and two orchestrators that
  call the hooks and handle loading/empty/error states:
  `workspace-analytics-section.tsx` (mounted on the workspace dashboard
  page) and `project-analytics-summary.tsx` (mounted on the project
  detail page).
- `issue-breakdown-response.ts`/`workload-response.ts` — one mapper per
  response shape, same rule as every other feature module's
  `*-response.ts` files. Both are pure functions with no Prisma access;
  the aggregation itself happens in `issueRepository` (see
  `repositories/issue/` above, which this milestone extended rather than
  splitting into a new `analyticsRepository`).

## `app/admin/` and `features/admin/` (Milestone 6)

`app/admin/` is a new top-level segment, the same structural choice as
`app/w/[slug]/` in Milestone 3: its own `layout.tsx` (not nested under
`(dashboard)`, which renders a different Navbar) does the `PlatformRole`
gate once per request. Pages: `page.tsx` (overview), `workspaces/page.tsx`

- `workspaces/[workspaceId]/page.tsx`, `users/page.tsx` +
  `users/[userId]/page.tsx`, `audit-log/page.tsx` — six total, each a thin
  Server Component with no repository calls (unlike most pages in this
  app), since Increment 6 was explicitly scoped to "hooks only" for data.

`features/admin/` follows the same shape as `features/analytics/` (no
`schemas/` folder except the one PATCH endpoint that needs one) plus a
`hooks/` folder sized like `features/issue/`'s:

- `admin-user-response.ts`, `admin-workspace-response.ts`,
  `audit-log-response.ts` — one mapper file per resource, same rule as
  every other feature module. `toIssueBreakdownResponse` from
  `features/analytics/` is reused unmodified for the overview endpoint's
  issue counts rather than duplicated here.
- `schemas/update-admin-user.schema.ts` — the only schema this feature
  needs, since every other admin endpoint is a read-only `GET`.
- `hooks/` — 8 files, one per query/mutation, same one-hook-per-file
  convention as every other feature: `use-admin-overview`,
  `use-admin-workspaces`/`use-admin-workspace`, `use-admin-users`/
  `use-admin-user`, `use-admin-audit-log`, `use-admin-health`, and the
  one mutation, `use-update-admin-user`. `use-admin-workspaces.ts` also
  declares the shared `PaginatedResponse<T>` generic (the first
  pagination this app has needed), imported by the other two paginated
  list hooks rather than redeclared — the same "declare once, import
  elsewhere" pattern `IssueBreakdownResponse` already established in
  Milestone 5.
- `components/` — 8 files: `stat-card.tsx` (the first plain
  "label + big number" tile in the app), `admin-overview-section.tsx`
  (stat tiles + the reused `StatusBreakdownChart`/`PriorityBreakdownChart`
  - a health panel with its own two-state failure UI),
    `pagination-controls.tsx` (Prev/Next + "Page X of Y", shared by all
    three paginated list components — the one genuinely shared UI piece;
    no `DataTable` abstraction was built, by explicit instruction),
    `admin-workspace-list.tsx`/`admin-workspace-detail.tsx`,
    `admin-user-list.tsx`/`admin-user-detail.tsx` (the role-change and
    isActive-toggle controls, both UX-only guards backed by real
    server-side enforcement — see `architecture.md`), `admin-audit-log-list.tsx`.

`repositories/system/health.repository.ts` is the one file in this
milestone that isn't a `features/admin/`-adjacent model repository — see
`architecture.md`'s "Admin Dashboard" section for why it exists and why
it isn't the `adminRepository` the Milestone 6 proposal explicitly ruled
out.

`src/lib/pagination.ts` — `parsePagination()`, the shared offset/limit
parser for all three paginated admin endpoints (Decision Point B1). Lives
in `lib/`, not `features/admin/`, since nothing about it is admin-specific;
any future paginated list endpoint can reuse it directly.

`tests/e2e/scripts/promote-user.ts` — a standalone script (same
tsx-subprocess pattern as `delete-test-user.ts`/`delete-test-workspace.ts`)
that promotes a test account's `PlatformRole` directly via Prisma, since
`register()` only ever creates `USER` and Milestone 6 is the first
milestone that needs `ADMIN`/`SUPER_ADMIN` test accounts.

## `components/ui/textarea.tsx` (Milestone 4)

The first multi-line text input the app has needed — hand-built (not
`npx shadcn@latest add textarea`, since no dependency update was in scope
for this increment) mirroring `input.tsx`'s styling exactly. Used for issue
description and comment body.

## Not a monorepo

There is no `apps/` or `packages/` split and no Turborepo. The original
System Design doc used one because the backend was a separate NestJS
service; once the backend became Next.js Route Handlers in the same app,
a workspace split stopped solving any real problem and was dropped.
