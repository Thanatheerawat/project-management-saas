import { z } from "zod";

import { passwordPolicySchema } from "@/features/auth/schemas/password-policy";

// `name`'s message is a translation key — see validation-messages.ts.
// `email` is untouched. `password` uses the shared policy (length +
// uppercase + lowercase + number) — see password-policy.ts.
export const registerSchema = z.object({
  name: z.string().min(1, "validation.nameRequired").max(100),
  email: z.email(),
  password: passwordPolicySchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
