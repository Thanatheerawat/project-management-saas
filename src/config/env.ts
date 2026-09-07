import { z } from "zod";

/**
 * Validates env vars actually consumed by the code that exists so far.
 * AI/Storage vars are added in their own milestones — declaring them
 * earlier would validate nothing and just be dead code.
 */
const envSchema = z
  .object({
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
    // M7 Increment 2: the AI breakdown Route Handler is the one place
    // that resolves this and passes it into createAIProvider() (the
    // factory itself stays env-free, see ai-provider-factory.ts).
    // Defaults to "mock", same reasoning as NODE_ENV's default, so
    // nothing that already imports env.ts breaks by not setting it.
    AI_PROVIDER: z.enum(["mock", "groq"]).default("mock"),
    // M7 Increment 3: optional here (mock mode needs nothing Groq-related
    // at all) — the .refine() below makes it conditionally required only
    // when AI_PROVIDER=groq, so a misconfigured production deploy fails
    // loudly at boot instead of failing per-request later. GroqAIProvider
    // itself never reads this directly — it receives the value as an
    // explicit constructor argument (see ai-provider-factory.ts).
    GROQ_API_KEY: z.string().min(1).optional(),
  })
  .refine((data) => data.AI_PROVIDER !== "groq" || !!data.GROQ_API_KEY, {
    message: "GROQ_API_KEY is required when AI_PROVIDER=groq",
    path: ["GROQ_API_KEY"],
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
