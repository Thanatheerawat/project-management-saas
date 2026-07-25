import { defineConfig, env } from "prisma/config";

// Prisma 7's config loader doesn't source .env on its own (unlike the old
// schema-based CLI), so DATABASE_URL has to be loaded explicitly here.
// Node's built-in loadEnvFile (22+) does that with zero new dependencies
// — no need for the `dotenv` package just for this one line.
process.loadEnvFile();

// Prisma 7: CLI-facing config (generate/migrate/studio) lives here instead
// of in schema.prisma. This is separate from the runtime Neon adapter in
// src/lib/prisma.ts — this file only affects `prisma` CLI commands.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
