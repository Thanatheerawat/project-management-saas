# Development Guide

## Working rules for this repo

- One milestone at a time — do not build multiple features in parallel.
- If a milestone turns out to need a change to Architecture, Folder
  Structure, or the locked Tech Stack, stop and explain why before making
  the change. Don't silently adjust and continue.
- Before a milestone is considered done: `pnpm lint`, `pnpm typecheck`, and
  `pnpm build` must all pass.
- After a milestone: update the relevant file(s) in `/docs` and summarize
  what was done, what remains, and what's next.
- No unused scaffolding: don't add a dependency, file, or config block
  before something in the current milestone actually needs it.

## Adding a new feature (from the Milestone 2+ onward)

1. Create `src/features/<feature-name>/` with only the subfolders it
   actually needs from: `components/`, `hooks/`, `services/`, `schemas/`,
   `types.ts`.
2. If it needs to read/write the database, add functions to
   `src/repositories/<entity>.repository.ts` — never call `prisma.*`
   directly from a Route Handler or a feature file.
3. Add the Route Handler under `src/app/api/...`, keeping it thin: parse
   input → call a feature/service/repository function → shape the
   response. Validate input with a `zod` schema colocated in the feature's
   `schemas/` folder.
4. If the feature needs global UI state (a modal open/closed, a draft
   value), add a small Zustand store colocated with the component that
   owns it. If it needs server data, use a TanStack Query hook instead —
   never Zustand for data that comes from the database.
5. Add shadcn/ui primitives via `npx shadcn@latest add <component>` rather
   than hand-rolling a component that already exists in `components/ui/`.

## Server state vs. client state

- **TanStack Query** — anything that comes from the database or an
  external API: issues, projects, org members, AI job status.
- **Zustand** — UI-only state with no server source of truth: sidebar
  collapsed/expanded, modal open/closed, draft form values before submit.

Mixing these up (e.g. caching server data in Zustand) reintroduces the
stale-cache bugs TanStack Query exists to prevent — keep the split strict.

## Testing structure

Three layers, each with a different job — a new feature typically touches
all three:

- **Unit (`pnpm test`, Vitest, files live next to what they test)** — pure
  logic only: password hashing, RBAC hierarchy checks, zod schemas that
  have actual branching (e.g. slug/hex-color regex, the
  null-vs-omitted-field distinction in `updateIssueSchema`). A schema with
  nothing but `min`/`max`/`uuid` constraints and no branching doesn't get
  a dedicated unit test — match the existing precedent in
  `features/*/schemas/` before adding one.
- **Integration (`pnpm test:integration`, `tests/integration/`)** — calls
  Route Handlers directly against the real Neon database (no test-DB
  split in this stack), mocking only `auth()`. One file per resource
  (`workspace`, `project`, `issue`, `label`, `issue-label`, `comment`,
  …), plus `workspace-isolation.integration.test.ts` as the single home
  for every cross-workspace 404 check regardless of which resource it's
  about. Shared fixtures (`sessionFor`, `uniqueEmail`, `uniqueSlug`,
  `deleteTestUser`, `deleteTestWorkspace`) live in `helpers.ts` — extend
  that file instead of copy-pasting a fixture into a new test file.
  Repository-level concurrency (e.g. the atomic issue-numbering test) is
  tested here too, calling the repository function directly rather than
  through an HTTP request.
- **E2E (`pnpm test:e2e`, Playwright, `tests/e2e/`)** — full browser
  journeys against a real running app and real database, reusing
  `actions.ts` (shared UI flows like `registerViaUi`) and
  `db-helpers.ts`/`scripts/` for cleanup. Prefer extending an existing
  spec file over creating a new one when the scenario is a variation of
  an existing journey (e.g. `issue-flow.spec.ts` mirrors
  `project-flow.spec.ts`'s single continuous-session pattern;
  `issue-permissions.spec.ts` mirrors `member-management.spec.ts`'s
  multi-browser-context pattern for RBAC checks). **Run against a
  production build** (`pnpm build && pnpm start`, then `pnpm test:e2e`)
  when diagnosing a failure before assuming it's a real bug — this
  environment has a recurring Turbopack dev-server flakiness issue under
  concurrent load (unrelated to OneDrive-sync issues also seen with
  `next dev`) that a production build doesn't exhibit; a failure that
  reproduces deterministically against a production build is real, one
  that only shows up under `next dev` most likely isn't.

Every milestone's final quality gate cleans the test database back to 0
rows in every affected table after the full suite runs — verify this
manually (a quick `SELECT count(*)` per table, or the same ad hoc cleanup
script pattern used throughout `docs/session-log.md`) before considering
a testing increment done.
