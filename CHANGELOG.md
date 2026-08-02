# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-08-03 - Milestone 4: Task Management Core (Issue Tracking)

A Kanban-style issue tracker on top of the Workspace/Project core — issues,
workspace-scoped labels, and comments, with full RBAC parity between the UI
and the API. Migrated on Neon and fully verified: unit, integration
(including a concurrency test proving atomic issue-numbering under real
concurrent load), and Playwright e2e tests, plus a dedicated architecture/
code audit and cleanup pass before this release. See
`docs/session-log.md` for the full history, including the approved
Decision Points A–H.

### Added

- Prisma models: `Issue` (`IssueStatus`: `BACKLOG`/`TODO`/`IN_PROGRESS`/
  `IN_REVIEW`/`DONE`/`CANCELLED`, `IssuePriority`: `URGENT`/`HIGH`/
  `MEDIUM`/`LOW`/`NONE`), `Label`, `IssueLabel` (join table), `Comment`;
  `Project.key` (short uppercase prefix, unique per workspace) and
  `Project.issueCounter`
- `deriveIssueKey()` (`src/lib/issue-key.ts`) and atomic per-project issue
  numbering (`Project.issueCounter` incremented inside the same
  `prisma.$transaction` that inserts the `Issue` row)
- Repositories: `repositories/issue/{issue,label,comment,issue-label}.repository.ts`
- API (15 endpoints): `/api/projects/[id]/issues` (list/create),
  `/api/issues/[id]` (get/update/delete), `/api/issues/[id]/labels`
  (list/attach), `/api/issues/[id]/labels/[labelId]` (detach),
  `/api/issues/[id]/comments` (list/create), `/api/comments/[id]`
  (edit/delete), `/api/workspaces/[id]/labels` (list/create),
  `/api/workspaces/[id]/labels/[labelId]` (update/delete)
- Response mappers: `toIssueResponse` (embeds attached labels so the
  Kanban board loads in a single request), `toLabelResponse`,
  `toCommentResponse`
- RBAC (Decision Points F/G/H): label definitions are `ADMIN`+,
  attach/detach is `MEMBER`+; any `MEMBER`+ can edit an issue, `ADMIN`+
  deletes; comments are author-edit, author-or-`ADMIN`+-delete
- Assignee validation (`validateAssignee`) and shared issue-context
  resolution (`resolveIssueContext`), both in
  `src/lib/auth/workspace-membership.ts`
- UI: Kanban board (`features/issue/components/kanban-board.tsx` +
  column/card), Create Issue dialog, Issue detail page
  (`/w/[slug]/projects/[id]/issues/[id]`) with instant-apply status
  control, edit form, label attach/detach + create, and comment CRUD
- TanStack Query hooks (16 files, `features/issue/hooks/`) for
  Issue/Label/Comment
- `constants/issue.ts` (status/priority color mapping) and
  `components/ui/textarea.tsx` (hand-built, no new dependency)
- Unit tests: `issue-key`, `create-label` schema, `update-issue` schema
  (20 new, 62 total)
- Integration tests against the real Neon database: Issue/Label/Comment/
  IssueLabel CRUD, RBAC, cross-workspace isolation, invalid-assignee,
  duplicate project-key collision, and a repository-level concurrency
  test (10 concurrent issue creates, asserting gap-free unique numbering)
  (55 new, 125 total, `pnpm test:integration`)
- Playwright e2e tests: full issue lifecycle (create/edit/status/label/
  comment/delete) and a three-browser-context permissions suite
  (owner/member/outsider) covering every RBAC decision point (25 new,
  59 total, `pnpm test:e2e`)

### Verification

- Migration `20260728223612_add_issue_tracking_core` applied to Neon;
  verified additive-only (`CREATE TYPE`/`CREATE TABLE`/
  `ALTER TABLE ADD COLUMN`/`CREATE INDEX`/`ADD FOREIGN KEY` only, no
  `DROP` touching Milestone 2/3 tables)
- A dedicated read-only architecture/code audit (9 findings, no
  correctness/security bugs) preceded a small cleanup pass — extracted
  `resolveIssueContext`/`validateAssignee`, fixed a Kanban-board label
  cache-invalidation gap
- Manual verification against real Neon with multiple real users
  confirmed RBAC parity between the UI and the API for every Decision
  Point
- Quality gate green end to end: `prisma generate`, `migrate status`,
  `lint`, `typecheck`, `build`, `test`, `test:integration`, `test:e2e`
  (the last run against a production build, per the Turbopack
  dev-server flakiness workaround established in Milestone 2/3)
- No new dependencies — zero changes to `package.json`/`pnpm-lock.yaml`
  throughout the entire milestone

## [0.3.0] - 2026-07-28 - Milestone 3: Workspace & Project Management Core

Multi-tenant workspaces with slug-based URLs, workspace-level RBAC
(Owner/Admin/Member) fully independent from Milestone 2's platform-level
RBAC, member management, and projects scoped to a workspace — migrated on
Neon and fully verified: unit, integration (including cross-workspace
isolation), and Playwright e2e tests, plus a full manual verification
pass. See `docs/session-log.md` for the full history, including the API
architecture review that preceded approval.

### Added

- Prisma models: `Workspace`, `WorkspaceMember` (`WorkspaceRole`:
  `MEMBER`/`ADMIN`/`OWNER`), `Project` (`ProjectStatus`: `ACTIVE`/
  `ON_HOLD`/`COMPLETED`/`ARCHIVED`)
- Workspace-level RBAC (`hasWorkspaceRole`/`requireWorkspaceRole`,
  `src/lib/auth/workspace-rbac.ts`) — deliberately independent from
  Milestone 2's `PlatformRole`; a platform `SUPER_ADMIN` does not
  automatically gain workspace access
- Membership resolution (`resolveWorkspaceMembership`/
  `resolveWorkspaceForRequest`, `src/lib/auth/workspace-membership.ts`)
  returning 404 — never 403 — for both a nonexistent workspace and one
  the caller isn't a member of
- API: `/api/workspaces` (list/create), `/api/workspaces/[id]`
  (get/update/delete), `/api/workspaces/[id]/members` (list/add),
  `/api/workspaces/[id]/members/[memberId]` (update role/remove),
  `/api/workspaces/[id]/projects` (list/create), `/api/projects/[id]`
  (get/update/delete) — 14 handlers total, with cross-workspace
  tampering guards and an owner-immutable invariant (role change/removal
  always rejected against the workspace Owner)
- Response mappers: `toWorkspaceResponse`/`toProjectResponse`/
  `toWorkspaceMemberResponse`
- Pages: workspace picker (`/workspaces`) and create (`/workspaces/new`),
  workspace dashboard/settings/members (`/w/[slug]`, `.../settings`,
  `.../members`), project list/create/detail/edit (`.../projects`,
  `.../projects/new`, `.../projects/[id]`, `.../projects/[id]/edit`)
- Slug generation (`src/lib/slug.ts`, hand-written, no new dependency)
- Unit tests: workspace RBAC, slug generation, `create-workspace`/
  `add-member` schema validation (28 new, 42 total)
- Integration tests against the real Neon database: workspace/member/
  project CRUD, RBAC, and a dedicated cross-workspace isolation suite
  asserting 404-not-403 everywhere (41 new, 70 total,
  `pnpm test:integration`)
- Playwright e2e tests: workspace creation/picker/switcher, project
  list/create/detail/edit, member management (two real concurrent
  browser contexts), workspace settings/rename (23 new, 34 total,
  `pnpm test:e2e`)

### Verification

- Migration `20260727023507_add_workspace_project_core` applied to Neon;
  verified additive-only (no `ALTER`/`DROP` touching Milestone 2 tables)
- Manual verification: full workspace → project → member journey across
  two real users, including cross-user isolation checked via direct API
  calls
- Quality gate green end to end: `prisma generate`, `migrate status`,
  `lint`, `typecheck`, `build`, `test`, `test:integration`, `test:e2e`
  (the last confirmed stable against a production build after
  diagnosing Turbopack dev-server flakiness under concurrent load)
- No new dependencies — slug generation and workspace-role helpers are
  hand-written, matching the locked stack

## [0.2.0] - 2026-07-27 - Milestone 2: Identity & Access Management

Register/Login/Logout, forgot/reset password, mock email verification, and
profile settings — migrated on Neon and fully verified: unit tests,
integration tests against the real database, Playwright e2e tests against
a real browser + real database, a full manual verification pass (10 flows,
security checks, database integrity checks), and a clean quality gate.
See `docs/session-log.md` for the full history, including bugs found and
fixed along the way.

### Added

- Prisma models: `User` (extended with `role`, `isActive`, `lastLoginAt`,
  `failedLoginAttempts`, `lockedUntil`), `Account`, `Session`,
  `VerificationToken`, `PasswordResetToken`, `AuditLog`
- Platform-level RBAC (`SUPER_ADMIN` > `ADMIN` > `USER`) via a single
  `requireRole()` helper
- next-auth v4 (Credentials provider, JWT session strategy) — see
  `docs/adr/006-nextauth-v4-credentials-jwt.md` for why v4 and no adapter
- Password hashing (`bcryptjs`), password reset and mock email
  verification flows (single-use, hashed, expiring tokens)
- Real route protection in `middleware.ts` (replaces the Foundation
  pass-through)
- Pages: login, register, forgot-password, reset-password, verify-email,
  profile — all client-rendered against TanStack Query hooks, no new form
  library
- API: `/api/auth/{register,forgot-password,reset-password,verify-email}`,
  `/api/users/{me,profile}`, plus next-auth's built-in
  `/api/auth/[...nextauth]` endpoints (session, callback, signout)
- `docs/auth-flow.md` (flow diagrams) and `docs/security.md` (OWASP
  Top 10 mapping)
- Unit tests: password hashing, RBAC hierarchy, register schema validation
  (14 tests)
- Integration tests against the real Neon database: register, login
  (lockout included), forgot/reset password, verify email, profile API,
  audit log repository (7 files, 29 tests, `pnpm test:integration`)
- Playwright e2e tests against a real browser and the real app: full auth
  journey (register → verify → protected route → logout → login → profile
  update → logout) plus redirect behavior (2 files, 11 tests,
  `pnpm test:e2e`)

### Dependencies

- `next-auth` (already in the locked stack, installed for the first time)
- `bcryptjs` (new — see `docs/adr` reasoning: pure JS avoids native-binding
  issues on Vercel serverless)

### Verification

- Initial migration `20260727002815_init_identity_access` applied to Neon;
  all 6 tables verified present with correct FK/cascade behavior
- Manual verification: 10 flows covering the full auth surface, cookie
  security (httpOnly/SameSite), password/token hashing, complete audit
  trail, and account-enumeration resistance — all passed
- Quality gate green end to end: `prisma generate`, `migrate status`,
  `lint`, `typecheck`, `build`, `test`, `test:integration`, `test:e2e`

## [0.1.0] - 2026-07-26 - Project Foundation

Initial project scaffold. No business logic, authentication, or database
models yet — this release establishes the technical foundation the rest of
the product is built on.

### Added

- Next.js (App Router) + TypeScript project scaffold
- Tailwind CSS v4 with the Orbit design system (color, typography, radius
  tokens) implemented as CSS custom properties, light and dark mode
- shadcn/ui component primitives (Radix-based): Button, Input, Card, Badge,
  Skeleton, Dialog, plus a hand-built EmptyState
- Layout foundation: Navbar, Sidebar (collapsible), Footer, Breadcrumb,
  PageContainer, ThemeToggle
- Global providers: theme (next-themes), server-state cache (TanStack
  Query, with devtools in development only), toast notifications (sonner)
- Zustand store for client/UI state (sidebar collapse), established as the
  client-state counterpart to TanStack Query's server-state role
- Prisma 7 wired against Neon Postgres via the `@prisma/adapter-neon`
  driver adapter (`prisma.config.ts` for CLI operations, no schema models
  yet)
- Environment variable validation (`zod`) for the variables currently in
  use
- Logger wrapper (`src/lib/logger.ts`) as a swap point for a real logging
  backend later
- Pass-through middleware (no auth/RBAC logic yet)
- Testing infrastructure: Vitest + React Testing Library + Playwright,
  configured but with no tests written yet
- Coding standards: ESLint, Prettier, Husky pre-commit/commit-msg hooks,
  lint-staged, commitlint (Conventional Commits)
- Project documentation: architecture, folder structure, coding standards,
  development guide, setup guide, a full session log, Architecture Decision
  Records (`docs/adr/`), and this changelog

### Notes

- Quality gate passed: `prisma generate`, `lint`, `typecheck`, `build`,
  `test` all green.
- Real business logic (auth, workspaces, issues, AI) begins at Milestone 2.
