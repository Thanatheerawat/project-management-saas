import { z } from "zod";

/**
 * Validates env vars actually consumed by the code that exists so far.
 * Only DATABASE_URL is here because the Neon adapter in src/lib/prisma.ts
 * reads it directly. Vars for Auth/AI/Storage are added in their own
 * milestones — declaring them earlier would validate nothing and just be
 * dead code.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({
    message: "DATABASE_URL must be a valid Postgres connection string",
  }),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
