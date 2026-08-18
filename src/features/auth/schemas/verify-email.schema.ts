import { z } from "zod";

// `token`'s message is a translation key, shared with
// reset-password.schema.ts's identical rule — see validation-messages.ts.
export const verifyEmailSchema = z.object({
  email: z.email(),
  token: z.string().min(1, "validation.tokenRequired"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
