import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  image: z.url().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
