import { z } from "zod";

// `password`'s message is a translation key, not literal text — see
// validation-messages.ts. `email` is untouched (M6.6 decision: leave
// z.email()'s own default message as-is).
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "validation.passwordRequired"),
});

export type LoginInput = z.infer<typeof loginSchema>;
