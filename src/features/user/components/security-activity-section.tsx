"use client";

import { History } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SECURITY_ACTIVITY_MESSAGE_KEYS } from "@/constants/security-activity";
import { useSecurityActivity } from "@/features/user/hooks/use-security-activity";

// M8.6: self-contained Card (own icon/heading), same shape as
// ChangePasswordForm (M8.4) — mounted directly in profile/page.tsx below
// Password & Security. Deliberately restrained: latest 5 events, no
// filters, no pagination, no per-event icons — a glance, not a dashboard.
export function SecurityActivitySection() {
  const t = useTranslations("profile");
  const activity = useSecurityActivity();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 flex size-9 shrink-0 items-center justify-center rounded-full">
            <History className="text-accent size-4.5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{t("securityActivity.title")}</CardTitle>
            <CardDescription>{t("securityActivity.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activity.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : activity.isError || !activity.data ? (
          <p className="text-destructive text-sm">{t("securityActivity.loadFailed")}</p>
        ) : activity.data.events.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("securityActivity.empty")}</p>
        ) : (
          // Same "list rows separated by a hairline divider, no
          // card-in-card" pattern AdminUserDetail's Member Workspaces list
          // already established (Phase 5, Signal & Structure).
          <div className="divide-border-muted flex flex-col divide-y">
            {activity.data.events.map((event) => {
              const messageKeys = SECURITY_ACTIVITY_MESSAGE_KEYS[event.action];
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-foreground text-sm font-medium">
                      {t(messageKeys.label as Parameters<typeof t>[0])}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t(messageKeys.description as Parameters<typeof t>[0])}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    {formatEventTimestamp(event.occurredAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Composed from the same locale-aware Date methods already used elsewhere
// in this codebase (recent-project-card.tsx's toLocaleDateString,
// issue-detail-panel.tsx's toLocaleString) rather than a new date library
// — see STEP 7. Produces e.g. "Sep 9, 2026 · 01:40".
function formatEventTimestamp(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} · ${timePart}`;
}
