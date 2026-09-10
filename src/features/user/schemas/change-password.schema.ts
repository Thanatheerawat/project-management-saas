import { z } from "zod";

import { passwordPolicySchema } from "@/features/auth/schemas/password-policy";

// `currentPassword`'s message is a translation key — see
// src/features/auth/schemas/validation-messages.ts (deliberately just
// `min(1)`, not the policy below — an existing password must stay valid
// for this check regardless of today's policy). `newPassword` uses the
// shared policy (password-policy.ts), same as register/reset-password.
// confirmPassword is deliberately not part of this schema — matching
// checking belongs client-side only (see ChangePasswordForm), same
// decision reset-password.schema.ts made for its own confirm field.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "validation.passwordRequired"),
  newPassword: passwordPolicySchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
