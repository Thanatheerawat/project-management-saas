import { prisma } from "../../../src/lib/prisma";

// Standalone script, run via `tsx` from db-helpers.ts (not imported
// directly into the Playwright process) — see db-helpers.ts for why.
async function main() {
  const email = process.argv[2];
  if (!email) {
    throw new Error("Usage: tsx delete-test-user.ts <email>");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  if (user) {
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
