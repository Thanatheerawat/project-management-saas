import { z } from "zod";

import { workspaceSlugSchema } from "@/features/workspace/schemas/create-workspace.schema";

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  slug: workspaceSlugSchema.optional(),
  description: z.string().max(500).optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
