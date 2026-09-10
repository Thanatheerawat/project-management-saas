import { z } from "zod";

import { passwordPolicySchema } from "@/features/auth/schemas/password-policy";

// `token`'s message is a translation key — see validation-messages.ts.
// `newPassword` uses the shared policy (password-policy.ts), the same
// one register.schema.ts/change-password.schema.ts use, so the rule
// can't drift between schemas.
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "validation.tokenRequired"),
  newPassword: passwordPolicySchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
