"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/features/auth/hooks/use-register";
import { registerSchema } from "@/features/auth/schemas/register.schema";
import { translateValidationMessage } from "@/features/auth/schemas/validation-messages";
import { ApiError } from "@/lib/api-client";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const register = useRegister();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(translateValidationMessage(t, parsed.error.issues[0]?.message));
      return;
    }

    try {
      const result = await register.mutateAsync(parsed.data);
      // Register only creates the account — sign in through the same
      // path a normal login uses rather than the route minting a session
      // itself (see src/app/api/auth/register/route.ts).
      await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      toast.success(t("accountCreated"));
      router.push(result.mockVerifyUrl);
      router.refresh();
    } catch (err) {
      // Known stable code -> its own translated message; anything else
      // (an ApiError with an unrecognized code, or no ApiError at all —
      // e.g. a network failure) falls back to the same generic message,
      // never the server's raw English `err.message`.
      const message =
        err instanceof ApiError && err.code === "email_taken"
          ? t("errors.emailTaken")
          : t("errors.registerFailed");
      setError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-foreground text-sm font-medium">
          {t("name")}
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          {t("email")}
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-foreground text-sm font-medium">
          {t("password")}
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={register.isPending}>
        {register.isPending ? t("creatingAccount") : t("createAccount")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          {t("alreadyHaveAccount")}
        </Link>
      </p>
    </form>
  );
}
