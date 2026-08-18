import { z } from "zod";

// `name`/`password`'s messages are translation keys — see
// validation-messages.ts. `email` is untouched.
export const registerSchema = z.object({
  name: z.string().min(1, "validation.nameRequired").max(100),
  email: z.email(),
  password: z.string().min(8, "validation.passwordMin8"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
