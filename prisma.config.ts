import { defineConfig, env } from "prisma/config";

// Prisma 7's config loader doesn't source .env on its own (unlike the old
// schema-based CLI), so DATABASE_URL has to be loaded explicitly here.
// Node's built-in loadEnvFile (22+) does that with zero new dependencies
// — no need for the `dotenv` package just for this one line.
//
// Only a physical .env file needs loading — that's true for local dev,
// but not for CI/Vercel, which inject env vars directly into
// process.env and never write a .env file to disk. loadEnvFile() throws
// ENOENT in that case, so it's only swallowed for that specific error;
// anything else (e.g. a permissions problem) still surfaces normally.
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

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
