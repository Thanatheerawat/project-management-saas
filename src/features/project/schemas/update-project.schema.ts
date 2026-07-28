import { z } from "zod";

import type { ProjectStatus } from "@/generated/prisma/client";

// `satisfies` fails to compile if ProjectStatus (schema.prisma) ever
// diverges from this literal list. Exported so the status <select> in the
// edit-project UI reuses this exact list instead of duplicating it.
export const PROJECT_STATUSES = [
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
] as const satisfies readonly ProjectStatus[];

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
