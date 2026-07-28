import { z } from "zod";

// Shared by create and update — kept here rather than duplicated so the
// format rule only needs to change in one place.
export const workspaceSlugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Slug can only contain lowercase letters, numbers, and hyphens (no leading/trailing/double hyphens)",
  );

// `slug` is optional here: if omitted, the create route generates one
// from `name` — see the Milestone 3 Architecture Proposal in
// docs/session-log.md for why slug *generation* is a route-layer concern,
// not a schema one.
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: workspaceSlugSchema.optional(),
  description: z.string().max(500).optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
