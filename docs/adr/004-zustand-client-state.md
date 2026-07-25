# ADR-004: Use Zustand for Client/UI State

**Status**: Accepted

## Context

The locked tech stack specifies Zustand for state management. With
TanStack Query (ADR-003) owning server state, Zustand's scope needed to be
defined explicitly so the two don't overlap or get confused.

## Decision

Zustand is used strictly for **client/UI-only state that has no server
source of truth** — e.g. `src/components/layout/sidebar-store.ts` holding
whether the sidebar is collapsed. It is never used to cache or mirror data
that comes from the database or an API.

## Consequences

- Small, boilerplate-free stores colocated with the component that owns
  them (not a single global store file).
- Clear mental model for contributors: "does this value come from the
  server?" → TanStack Query. "Is it purely local UI state?" → Zustand.

## Trade-offs

- Requires ongoing discipline — nothing technically stops someone from
  putting server data in a Zustand store, which would reintroduce the
  stale-cache problems TanStack Query exists to prevent. Enforced by
  convention and code review, not by tooling.
