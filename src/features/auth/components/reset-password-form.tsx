"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResetPassword } from "@/features/auth/hooks/use-reset-password";
import { resetPasswordSchema } from "@/features/auth/schemas/reset-password.schema";
import { ApiError } from "@/lib/api-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resetPassword = useResetPassword();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ token, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    try {
      await resetPassword.mutateAsync(parsed.data);
      toast.success("Password reset successfully");
      router.push("/login");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "This link is invalid or has expired";
      setError(message);
      toast.error(message);
    }
  }

  if (!token) {
    return <p className="text-destructive text-sm">This link is invalid</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-foreground text-sm font-medium">
          New Password
        </label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={resetPassword.isPending}>
        {resetPassword.isPending ? "Saving..." : "Reset Password"}
      </Button>
    </form>
  );
}
