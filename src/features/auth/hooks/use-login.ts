import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";

import type { LoginInput } from "@/features/auth/schemas/login.schema";

// Login isn't a custom endpoint — it's next-auth's own
// callback/credentials flow (see docs/auth-flow.md). This hook just gives
// it the same useMutation ergonomics (isPending, error) as every other
// form on the page.
export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginInput) => {
      const result = await signIn("credentials", { ...data, redirect: false });
      if (result?.error) {
        throw new Error("Invalid email or password");
      }
      return result;
    },
  });
}
