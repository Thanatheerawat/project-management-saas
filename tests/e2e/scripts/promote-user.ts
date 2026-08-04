import type { PlatformRole } from "../../../src/generated/prisma/client";
import { prisma } from "../../../src/lib/prisma";

// Standalone script, run via `tsx` from db-helpers.ts (not imported
// directly into the Playwright process) — same reasoning as
// delete-test-user.ts. `register()` only ever creates PlatformRole
// "USER" (Milestone 2); promoting to ADMIN/SUPER_ADMIN for Milestone 6's
// e2e coverage has to go through Prisma directly, exactly as the
// Milestone 6 proposal's Testing strategy anticipated. The `PlatformRole`
// import is type-only, so — unlike importing `prisma` itself — it's
// erased at compile time and never triggers db-helpers.ts's CJS/ESM
// concern about the generated client.
async function main() {
  const email = process.argv[2];
  const role = process.argv[3] as PlatformRole | undefined;
  if (!email || !role) {
    throw new Error("Usage: tsx promote-user.ts <email> <ADMIN|SUPER_ADMIN>");
  }

  await prisma.user.update({ where: { email }, data: { role } });
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
