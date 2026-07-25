# ADR-003: Use TanStack Query for Server State

**Status**: Accepted

## Context

The locked tech stack specified a "Query Provider" as part of Global
Providers without naming a library. Separately, the serverless-first
architecture (ADR-005) rules out a WebSocket gateway, so board updates
need a client-side fetching/caching/polling strategy instead of a push
connection.

## Decision

Use TanStack Query for all server state — data fetched from Route
Handlers: issues, projects, org members, AI job status, etc. `QueryClient`
is provided once via `src/providers/query-provider.tsx`, with React Query
Devtools mounted only when `NODE_ENV === "development"`.

## Consequences

- One consistent model for loading/error/retry/caching across every
  feature that fetches server data.
- `refetchInterval`-based polling gives a workable near-real-time board
  sync without any push infrastructure.
- Establishes a firm rule (see `docs/development-guide.md`): TanStack
  Query is for server state, Zustand (ADR-004) is for client/UI state —
  never both for the same piece of data.

## Trade-offs

- Adds a concept beyond plain `fetch` that contributors need to learn.
- Polling is not true real-time — perceptibly slower than a push
  connection would be. Accepted as a Foundation/MVP trade-off (see
  ADR-005); revisit with a push-based service (e.g. Pusher, Ably) only if
  polling proves insufficient in practice.
