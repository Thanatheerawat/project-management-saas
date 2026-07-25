# ADR-002: Use Prisma 7 with Neon Adapter

**Status**: Accepted

## Context

`prisma`/`@prisma/client` resolved to v7.9.0 on install. Prisma 7 removed
`url`/`directUrl` from `schema.prisma`'s `datasource` block entirely —
connection configuration must move to `prisma.config.ts`, and the runtime
`PrismaClient` requires a driver adapter instead of a plain connection
string. This surfaced mid-Foundation as a real build blocker, not a
pre-planned choice.

## Decision

Adopt Prisma 7's driver-adapter pattern rather than pinning back to
Prisma 6:

- `prisma.config.ts` (repo root) configures the CLI (`generate`,
  `migrate`), loading `.env` via Node's built-in `process.loadEnvFile()`.
- `src/lib/prisma.ts` constructs `PrismaClient` with a `PrismaNeon`
  adapter (`@prisma/adapter-neon`, backed by `@neondatabase/serverless`),
  which queries Neon over HTTP instead of classic TCP.
- `generator client` uses the new `prisma-client` provider (replacing the
  deprecated `prisma-client-js`) with an explicit `output` path
  (`src/generated/prisma`, gitignored).

## Consequences

- No separate `DIRECT_URL` — the HTTP-based adapter sidesteps the
  prepared-statement limitation that made a non-pooled connection
  necessary for migrations under the old TCP setup.
- One `DATABASE_URL` serves both the CLI and the runtime client.
- Generated client code lives in-repo at `src/generated/prisma` (not
  `node_modules/@prisma/client`), imported as `@/generated/prisma/client`.

## Trade-offs

- Prisma 7 and the `prisma-client` generator are newer and less
  battle-tested than the classic `prisma-client-js` + connection-string
  setup most tutorials still show.
- Ties the project more explicitly to Neon's HTTP driver semantics rather
  than being ORM-and-database-agnostic at the connection layer — acceptable
  since Neon was already the locked database choice.
- Two dependencies added beyond the original locked stack list
  (`@prisma/adapter-neon`, `@neondatabase/serverless`), approved as part of
  the existing Prisma+Neon stack rather than a stack change.
