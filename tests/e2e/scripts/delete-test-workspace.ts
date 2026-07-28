import { prisma } from "../../../src/lib/prisma";

// Standalone script, run via `tsx` from db-helpers.ts — same ESM/CJS
// reasoning as delete-test-user.ts. deleteMany (not delete) so a test that
// already deleted the workspace itself doesn't need special-casing here;
// WorkspaceMember/Project rows cascade with it (onDelete: Cascade).
async function main() {
  const slug = process.argv[2];
  if (!slug) {
    throw new Error("Usage: tsx delete-test-workspace.ts <slug>");
  }

  await prisma.workspace.deleteMany({ where: { slug } });
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
