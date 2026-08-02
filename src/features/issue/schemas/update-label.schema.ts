import { z } from "zod";

import { hexColorSchema } from "@/features/issue/schemas/create-label.schema";

export const updateLabelSchema = z.object({
  name: z.string().min(1, "Name is required").max(50).optional(),
  color: hexColorSchema.optional(),
});

export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
