"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForgotPassword } from "@/features/auth/hooks/use-forgot-password";
import { forgotPasswordSchema } from "@/features/auth/schemas/forgot-password.schema";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    try {
      await forgotPassword.mutateAsync(parsed.data);
      toast.success("If an account exists, a link has been sent");
    } catch {
      toast.error("Request failed, please try again");
    }
  }

  // Same confirmation shown whether or not the email exists — the API
  // itself never reveals which (docs/security.md, A04).
  if (forgotPassword.isSuccess) {
    return (
      <p className="text-muted-foreground text-sm">
        If an account exists for this email, we&apos;ve sent a password reset link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email
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
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={forgotPassword.isPending}>
        {forgotPassword.isPending ? "Sending..." : "Send Reset Link"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
