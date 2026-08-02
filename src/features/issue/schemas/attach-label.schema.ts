import { z } from "zod";

export const attachLabelSchema = z.object({
  labelId: z.uuid(),
});

export type AttachLabelInput = z.infer<typeof attachLabelSchema>;
