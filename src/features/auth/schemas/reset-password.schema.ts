import { z } from "zod";

// Both messages are translation keys — see validation-messages.ts. Reuses
// the exact same keys register.schema.ts uses for the identical rules
// (min-8 password, required token), so the translated text can't drift
// between the two schemas.
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "validation.tokenRequired"),
  newPassword: z.string().min(8, "validation.passwordMin8"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
