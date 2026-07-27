import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const CLEANUP_SCRIPT = path.resolve(__dirname, "./scripts/delete-test-user.ts");

let counter = 0;

// A distinct domain from tests/integration/helpers.ts's
// orbit-integration-test.local so leftover-data checks can tell the two
// suites' data apart if something ever goes wrong.
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}@orbit-e2e-test.local`;
}

// Deliberately does NOT import src/lib/prisma directly: the Prisma 7
// generated client (src/generated/prisma) is ESM-only, and Playwright
// compiles test files to CommonJS — importing it here fails with
// "ReferenceError: exports is not defined". Running the delete in a
// separate `tsx` process (already a devDependency, used the same way for
// prisma/seed.ts) sidesteps that without touching the app's module
// system. The same DATABASE_URL is inherited from this process's env,
// loaded once in tests/e2e/global-setup.ts before workers are forked.
export async function deleteTestUser(email: string): Promise<void> {
  // exec (not execFile) + manual quoting: the project path contains
  // spaces ("Project Management SaaS"), and execFile's shell:true does
  // not reliably auto-quote arguments containing spaces on Windows.
  await execAsync(`pnpm exec tsx "${CLEANUP_SCRIPT}" "${email}"`, { cwd: PROJECT_ROOT });
}
