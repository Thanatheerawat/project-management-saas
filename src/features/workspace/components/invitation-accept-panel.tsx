"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useAcceptInvitation } from "@/features/workspace/hooks/use-accept-invitation";
import { ApiError } from "@/lib/api-client";

// Only ever rendered when the page already confirmed a session exists
// (see (auth)/invitations/page.tsx) — this component never has to
// consider the "not signed in" case itself.
export function InvitationAcceptPanel() {
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const token = searchParams.get("token") ?? "";
  const acceptInvitation = useAcceptInvitation();

  if (!token) {
    return <p className="text-destructive text-sm">{t("errors.invitationInvalid")}</p>;
  }

  if (acceptInvitation.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-foreground text-sm">
          {t("invitationAcceptedMessage", {
            workspace: acceptInvitation.data.workspace.name,
          })}
        </p>
        <Button asChild>
          <Link href={`/w/${acceptInvitation.data.workspace.slug}`}>
            {t("goToWorkspace")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t("invitationAcceptPrompt")}</p>
      {acceptInvitation.isError && (
        <p className="text-destructive text-sm">
          {acceptInvitation.error instanceof ApiError &&
          acceptInvitation.error.code === "invitation_expired"
            ? t("errors.invitationExpired")
            : acceptInvitation.error instanceof ApiError &&
                acceptInvitation.error.code === "invitation_used"
              ? t("errors.invitationUsed")
              : acceptInvitation.error instanceof ApiError &&
                  acceptInvitation.error.code === "email_mismatch"
                ? t("errors.invitationEmailMismatch")
                : t("errors.invitationInvalid")}
        </p>
      )}
      <Button
        onClick={() => acceptInvitation.mutate({ token })}
        disabled={acceptInvitation.isPending}
      >
        {acceptInvitation.isPending ? t("accepting") : t("acceptInvitation")}
      </Button>
    </div>
  );
}
