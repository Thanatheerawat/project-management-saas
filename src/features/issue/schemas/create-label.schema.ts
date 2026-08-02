import { z } from "zod";

// Shared with update-label.schema.ts — labels are freeform (no fixed
// palette enforced, unlike Status/Priority which use the locked
// design-token colors), so any 6-digit hex value is accepted.
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #B2551E");

export const createLabelSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  color: hexColorSchema,
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
