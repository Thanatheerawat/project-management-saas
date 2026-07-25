import { logger } from "../src/lib/logger";
import { prisma } from "../src/lib/prisma";

// No models exist yet (see schema.prisma) — this only establishes the
// entry point + script wiring the Database milestone will fill in.
async function main() {
  logger.info("Seed skipped: no models defined yet");
}

main()
  .catch((error) => {
    logger.error("Seed failed", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
