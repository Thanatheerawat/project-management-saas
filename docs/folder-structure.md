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

Pages under this segment: `page.tsx` (dashboard shell), `settings/page.tsx`,
`members/page.tsx`, `projects/page.tsx` (list), `projects/new/page.tsx`,
`projects/[projectId]/page.tsx` (detail), `projects/[projectId]/edit/page.tsx`.
Each of the ADMIN+-gated pages (settings edit, project create/edit) does its
own page-level role check for UX (showing a read-only view or a message
instead of a form that would 403 on submit) — the actual enforcement is
server-side in the Route Handler either way.

## `features/workspace/` and `features/project/`

Milestone 3's domain modules, following the same shape as `features/auth/`
and `features/user/`: `schemas/` (zod, shared between client forms and
Route Handlers), `hooks/` (TanStack Query, one file per query/mutation),
`components/` (client-side forms and lists), plus a `*-response.ts` per
resource (`toWorkspaceResponse`/`toProjectResponse`/
`toWorkspaceMemberResponse`) — the single mapper every Route Handler for
that resource uses, so list/create/detail/update endpoints can't drift into
returning different field sets for the same resource.

## Not a monorepo

There is no `apps/` or `packages/` split and no Turborepo. The original
System Design doc used one because the backend was a separate NestJS
service; once the backend became Next.js Route Handlers in the same app,
a workspace split stopped solving any real problem and was dropped.
