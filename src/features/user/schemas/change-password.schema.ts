import { z } from "zod";

// Message keys are shared with register.schema.ts/reset-password.schema.ts
// (see src/features/auth/schemas/validation-messages.ts) — same rules
// (required, min-8), so the translated text can't drift between schemas.
// confirmPassword is deliberately not part of this schema — matching
// checking belongs client-side only (see ChangePasswordForm), same
// decision reset-password.schema.ts made for its own confirm field.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "validation.passwordRequired"),
  newPassword: z.string().min(8, "validation.passwordMin8"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
