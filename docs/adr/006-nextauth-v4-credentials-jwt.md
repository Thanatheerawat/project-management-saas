# ADR-006: next-auth v4 (Credentials + JWT, no Adapter)

**Status**: Accepted

## Context

The Milestone 2 plan was written assuming Auth.js v5's unified `auth()`
API (`handlers`, `auth`, `signIn`, `signOut` all from one config export).
Installing `next-auth` without a version pin resolved to **v4.24.15** — v5
is still a beta release under a different dist-tag, and pnpm installed the
stable major version by default. This surfaced during Milestone 2
implementation, not before.

Separately, while wiring up the Credentials provider, it became clear that
a `PrismaAdapter` isn't needed at all for this milestone's actual
requirements.

## Decision

1. **Use next-auth v4's classic API**, not v5's unified helper:
   - `src/lib/auth/auth.config.ts` exports a `NextAuthOptions` object.
   - `src/lib/auth/auth.ts` wraps `getServerSession(authOptions)` behind a
     same-named `auth()` function, so calling code doesn't know or care
     which major version is underneath — only this one file would change
     on a future v5 upgrade.
   - `src/middleware.ts` uses `getToken()` from `next-auth/jwt` (the
     Edge-compatible way to read a session in v4 middleware), not the
     `auth()` wrapper, since middleware runs on a raw `NextRequest`, not
     the `cookies()`-based context `getServerSession` expects.

2. **No `PrismaAdapter`.** The adapter's job is persisting OAuth accounts
   and database sessions. This milestone uses only the Credentials
   provider with the JWT session strategy — neither needs an adapter. The
   `Account`/`Session`/`VerificationToken` tables stay in `schema.prisma`
   for when a real OAuth provider is added later; only `VerificationToken`
   is actually used right now, repurposed for the mock email-verification
   flow (see the model comment in `schema.prisma`).

## Consequences

- No `@next-auth/prisma-adapter` dependency needed — avoids a dependency
  the original plan didn't anticipate needing.
- `authorize()` in the Credentials provider does its own user lookup,
  password verification, lockout, and audit logging directly against the
  repository layer — all in one reviewable place
  (`src/lib/auth/auth.config.ts`).
- Env var is `NEXTAUTH_SECRET` (v4 convention), not `AUTH_SECRET` (v5) —
  the Milestone 2 plan's placeholder name was corrected during
  implementation.

## Trade-offs

- v4 is the more mature, better-documented version — arguably a better
  fit for "production ready" than a long-running beta, but it does mean
  the eventual upgrade path to Auth.js v5 (if ever taken) is a real
  migration, not a version bump. The `auth()` wrapper exists specifically
  to contain that future change to one file.
- Skipping the adapter now means adding GitHub OAuth later requires
  wiring the adapter in at that point — a known, deferred cost, not a
  blocker, since the schema already anticipates it.
