import { z } from "zod";

/**
 * Validates env vars actually consumed by the code that exists so far.
 * AI/Storage vars are added in their own milestones — declaring them
 * earlier would validate nothing and just be dead code.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({
    message: "DATABASE_URL must be a valid Postgres connection string",
  }),
  // NextAuth v4 convention (not AUTH_SECRET, which is the v5/Auth.js name)
  NEXTAUTH_SECRET: z
    .string()
    .min(
      32,
      "NEXTAUTH_SECRET must be at least 32 characters — generate with `openssl rand -base64 32`",
    ),
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
