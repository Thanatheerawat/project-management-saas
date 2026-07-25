# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
