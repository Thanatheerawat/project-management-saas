import { z } from "zod";

import { ASSIGNABLE_WORKSPACE_ROLES } from "@/features/workspace/schemas/add-member.schema";

export const updateWorkspaceMemberRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_WORKSPACE_ROLES),
});

export type UpdateWorkspaceMemberRoleInput = z.infer<
  typeof updateWorkspaceMemberRoleSchema
>;
