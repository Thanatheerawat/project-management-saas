// Runs once in the main test-runner process before any worker is forked.
// Worker processes inherit process.env at fork time, so loading the real
// DATABASE_URL/NEXTAUTH_SECRET here (same mechanism prisma.config.ts
// uses — Node's built-in loader, no dotenv dependency) makes them
// available wherever a spec statically imports src/lib/prisma.
export default function globalSetup(): void {
  process.loadEnvFile();
}
