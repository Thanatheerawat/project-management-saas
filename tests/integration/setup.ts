// Same mechanism prisma.config.ts uses to load `.env` for the CLI — Node's
// built-in loader, so integration tests see the real DATABASE_URL without
// adding a dependency like dotenv.
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
