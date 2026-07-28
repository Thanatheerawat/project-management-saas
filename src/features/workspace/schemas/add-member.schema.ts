import { z } from "zod";

import type { WorkspaceRole } from "@/generated/prisma/client";

// OWNER deliberately excluded — ownership only ever changes via a
// dedicated transfer-ownership action, never through "add" or "update
// role" (see update-member-role.schema.ts, which reuses this constant).
// The `satisfies` check fails to compile if WorkspaceRole ever gains a
// member that isn't accounted for here.
export const ASSIGNABLE_WORKSPACE_ROLES = [
  "MEMBER",
  "ADMIN",
] as const satisfies readonly Exclude<WorkspaceRole, "OWNER">[];

// Adding a member requires they already have a TeamFlow account — no
// email-invite flow yet (no real email delivery exists, same mock-only
// constraint as Milestone 2's forgot-password/verify-email).
export const addWorkspaceMemberSchema = z.object({
  email: z.email(),
  role: z.enum(ASSIGNABLE_WORKSPACE_ROLES).default("MEMBER"),
});

export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
