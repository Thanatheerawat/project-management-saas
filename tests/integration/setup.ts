// Same mechanism prisma.config.ts uses to load `.env` for the CLI — Node's
// built-in loader, so integration tests see the real DATABASE_URL without
// adding a dependency like dotenv.
process.loadEnvFile();
