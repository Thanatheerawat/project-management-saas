"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/features/auth/hooks/use-verify-email";

// There is no real email provider yet (docs/security.md notes this
// explicitly) — the register flow redirects here with the mock link's
// email/token already in the URL so this is directly demoable without a
// real inbox.
export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const verifyEmail = useVerifyEmail();

  if (verifyEmail.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-foreground text-sm">Email verified successfully</p>
        {/* "/workspaces", not "/profile" — same reasoning as login-form.tsx:
            it already resolves 0/1/many memberships into the actual app
            instead of stranding a brand-new user on a settings page. */}
        <Button asChild>
          <Link href="/workspaces">Go to Workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="bg-muted text-foreground border-border rounded-md border px-3 py-2 text-xs font-medium">
        MOCK — there&apos;s no real email delivery yet; this link simulates the email
        you&apos;d receive.
      </p>
      <p className="text-muted-foreground text-sm">
        Click confirm to simulate clicking the verification link from the email ({email})
      </p>
      {verifyEmail.isError && (
        <p className="text-destructive text-sm">This link is invalid or has expired</p>
      )}
      <Button
        onClick={() =>
          verifyEmail.mutate(
            { email, token },
            {
              onSuccess: () => toast.success("Email verified"),
              onError: () => toast.error("Failed to verify email"),
            },
          )
        }
        disabled={!email || !token || verifyEmail.isPending}
      >
        {verifyEmail.isPending ? "Verifying..." : "Verify Email"}
      </Button>
    </div>
  );
}
