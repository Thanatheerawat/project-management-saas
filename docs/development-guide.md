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
