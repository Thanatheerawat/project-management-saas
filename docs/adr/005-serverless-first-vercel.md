# ADR-005: Serverless-first Architecture on Vercel

**Status**: Accepted

## Context

The original System Design doc assumed a NestJS backend with a separate
worker process, a WebSocket gateway, Redis, and Fly.io deployment. The
Development Plan later locked the stack to Next.js Route Handlers deployed
on Vercel only. Vercel functions are stateless and short-lived — there is
no place to run a persistent worker or hold a WebSocket connection open.

## Decision

Design around serverless constraints instead of working around them:

- **No queue / worker process.** AI generation (Groq or Mock provider)
  calls the provider directly from a Route Handler using a streaming
  response. The call is slow (seconds) but bounded — well within what a
  single request can hold open.
- **No WebSocket gateway.** Real-time board sync uses TanStack Query
  (ADR-003) polling/revalidation instead of a push connection.
- **No separate direct-connection concern for the database** — Prisma's
  Neon adapter (ADR-002) queries over HTTP, which fits the same
  stateless-function model.

## Consequences

- A single deployable unit and a single deploy target (Vercel) — no
  worker fleet, no Redis, no separate API host to operate.
- AI and data-fetching code is written for request/response and polling,
  not for a persistent-connection or queue-consumer model.

## Trade-offs

- Real-time collaboration is "near-real-time" (polling interval), not
  instant push. This is an accepted MVP trade-off, not an oversight —
  documented here specifically so it isn't rediscovered and re-litigated
  during Task Management or Dashboard work. If it proves insufficient, the
  fix is a managed push service (e.g. Pusher, Ably free tier), not
  standing up our own WebSocket infrastructure.
- Every Route Handler must complete within Vercel's function duration
  limit — long-running work has to be designed as streaming or
  short-and-bounded, never a fire-and-forget background job.
