import { PrismaNeon } from "@prisma/adapter-neon";

import { env } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";

// Hot-reload-safe singleton: without this, every module reload in dev
// (and every serverless invocation without care) would open a fresh
// Postgres connection until Neon's connection limit is exhausted.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 requires a driver adapter instead of a plain connection string.
// PrismaNeon queries over Neon's HTTP driver, which is why a separate
// non-pooled DIRECT_URL (needed by the old TCP-based setup) is gone.
const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
