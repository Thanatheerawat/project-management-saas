import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { InvitationAcceptPanel } from "@/features/workspace/components/invitation-accept-panel";
import { auth } from "@/lib/auth/auth";

// Reuses `auth.invitationHeading` (the page's own visible h1) plus the
// same literal " — Orbit" brand suffix every page in this group uses.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: `${t("invitationHeading")} — Orbit` };
}

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("auth");
  const session = await auth();
  const { token } = await searchParams;

  // Unauthenticated: never validate the token here at all — possession
  // of the raw token is meaningless without a matching signed-in account
  // (see the accept route's email-binding check), so there is nothing
  // useful or safe to preview before sign-in/sign-up. callbackUrl
  // preserves the exact query string so login-form.tsx's existing
  // callbackUrl handling (and register-form.tsx's new equivalent) return
  // the user right back here to actually accept.
  if (!session?.user) {
    const callbackUrl = `/invitations${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {t("invitationHeading")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("invitationSignInPrompt")}</p>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              {t("signInHeading")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              {t("createAccount")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        {t("invitationHeading")}
      </h1>
      <Suspense>
        <InvitationAcceptPanel />
      </Suspense>
    </div>
  );
}
