import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const CLEANUP_SCRIPT = path.resolve(__dirname, "./scripts/delete-test-user.ts");
const CLEANUP_WORKSPACE_SCRIPT = path.resolve(
  __dirname,
  "./scripts/delete-test-workspace.ts",
);
const PROMOTE_SCRIPT = path.resolve(__dirname, "./scripts/promote-user.ts");

let counter = 0;

// A distinct domain from tests/integration/helpers.ts's
// orbit-integration-test.local so leftover-data checks can tell the two
// suites' data apart if something ever goes wrong.
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}@orbit-e2e-test.local`;
}

// Same uniqueness reasoning as uniqueEmail, for Workspace.slug — lowercase
// alphanumeric-and-hyphens only, matching workspaceSlugSchema's regex.
export function uniqueSlug(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`.toLowerCase();
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

// Deletes the workspace (WorkspaceMember/Project rows cascade with it) —
// always run this before deleteTestUser for the same test's owner, since
// Project.ownerId is onDelete: Restrict and would otherwise block the user
// delete while they still own a project.
export async function deleteTestWorkspace(slug: string): Promise<void> {
  await execAsync(`pnpm exec tsx "${CLEANUP_WORKSPACE_SCRIPT}" "${slug}"`, {
    cwd: PROJECT_ROOT,
  });
}

// Register only ever creates PlatformRole "USER" — Milestone 6's admin
// dashboard e2e coverage needs ADMIN/SUPER_ADMIN accounts, which requires
// going through Prisma directly (same tsx-subprocess reasoning as the
// other helpers in this file). The caller still has to sign the promoted
// account out and back in afterward — the JWT bakes `role` in at sign-in
// (auth.config.ts's jwt callback), so it won't pick up the change until
// the next login.
export async function promoteUser(
  email: string,
  role: "ADMIN" | "SUPER_ADMIN",
): Promise<void> {
  await execAsync(`pnpm exec tsx "${PROMOTE_SCRIPT}" "${email}" "${role}"`, {
    cwd: PROJECT_ROOT,
  });
}
