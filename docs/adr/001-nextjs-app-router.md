# ADR-001: Use Next.js App Router

**Status**: Accepted

## Context

The original System Design doc planned a NestJS backend as a separate
service from the frontend, deployed independently. Once the tech stack was
locked to Next.js Route Handlers on Vercel, the backend and frontend became
the same deployable unit, and a router had to be chosen.

## Decision

Use Next.js's App Router (not the Pages Router, not a separate backend
framework). Route Handlers under `src/app/api/**` serve as the backend;
Server Components render pages by default, with `"use client"` opted into
only where interactivity is needed.

## Consequences

- Frontend and backend ship together in one Vercel deployment — no
  cross-service deploy coordination.
- Server Components reduce client-side JS by default.
- Route Handlers stay thin per `docs/architecture.md`'s layering rule —
  they call into `features/`/`services/`/`repositories/`, not the other
  way around.

## Trade-offs

- Less separation between web and API layers than a dedicated backend
  service — a route handler bug can affect page rendering paths, and vice
  versa isn't cleanly walled off the way two services would be.
- Requires discipline about the Server/Client Component boundary. This is
  not theoretical: Foundation already hit a real build failure from it —
  shadcn-generated `button.tsx`/`badge.tsx` used Radix's `Slot` without
  `"use client"`, which broke prerendering until fixed.
