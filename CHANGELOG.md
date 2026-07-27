# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
