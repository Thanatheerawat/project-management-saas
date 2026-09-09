"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORTED_TIMEZONES } from "@/constants/timezone";
import { useResendVerification } from "@/features/auth/hooks/use-resend-verification";
import { type ProfileResponse, useProfile } from "@/features/user/hooks/use-profile";
import { useUpdateProfile } from "@/features/user/hooks/use-update-profile";
import { type ProfileInput, profileSchema } from "@/features/user/schemas/profile.schema";
import { translateValidationMessage } from "@/features/user/schemas/validation-messages";
import { ApiError } from "@/lib/api-client";
import { getInitials } from "@/lib/utils";

export function ProfileForm() {
  const t = useTranslations("profile");
  const profile = useProfile();

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return <p className="text-destructive text-sm">{t("errors.loadFailed")}</p>;
  }

  // A separate component so every field initializes directly from the
  // loaded profile (no effect needed to sync it in after the fact — this
  // only ever mounts once profile.data exists), same discipline
  // issue-detail-panel.tsx documents for EditIssueForm.
  return <ProfileSections data={profile.data} />;
}

function ProfileSections({ data }: { data: ProfileResponse }) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader data={data} />
      <PersonalInformationCard data={data} />
      <AccountInformationCard data={data} />
    </div>
  );
}

// M8.5: avatar/fallback, name, job title/location, email + a compact
// verification glance — "visually strong but restrained" per spec, so the
// interactive resend affordance (with its own cooldown state) stays only
// in AccountInformationCard's VerificationStatus, not duplicated here.
function ProfileHeader({ data }: { data: ProfileResponse }) {
  const t = useTranslations("profile");
  const metaParts = [data.jobTitle, data.location].filter(
    (part): part is string => !!part,
  );

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <Avatar className="size-16 shrink-0">
        {data.image && <AvatarImage src={data.image} alt="" />}
        <AvatarFallback className="text-lg">{getInitials(data)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {data.name ?? data.email}
        </h1>
        {metaParts.length > 0 && (
          <p className="text-muted-foreground text-sm">{metaParts.join(" · ")}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-muted-foreground text-sm">{data.email}</span>
          {data.emailVerified ? (
            <span className="text-foreground inline-flex items-center gap-1 text-xs font-medium">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {t("header.verified")}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs font-medium">
              {t("header.notVerified")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonalInformationCard({ data }: { data: ProfileResponse }) {
  const t = useTranslations("profile");
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(data.name ?? "");
  const [jobTitle, setJobTitle] = useState(data.jobTitle ?? "");
  const [location, setLocation] = useState(data.location ?? "");
  const [timezone, setTimezone] = useState(data.timezone ?? "");
  const [website, setWebsite] = useState(data.website ?? "");
  const [bio, setBio] = useState(data.bio ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = profileSchema.safeParse({
      name,
      jobTitle,
      location,
      timezone,
      website,
      bio,
    } satisfies Omit<ProfileInput, "image">);
    if (!parsed.success) {
      setError(translateValidationMessage(t, parsed.error.issues[0]?.message));
      return;
    }

    try {
      await updateProfile.mutateAsync(parsed.data);
      toast.success(t("changesSaved"));
    } catch {
      const message = t("errors.updateFailed");
      setError(message);
      toast.error(message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("personalInformation")}</CardTitle>
        <CardDescription>{t("personalInformationDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-foreground text-sm font-medium">
              {t("fullName")}
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="jobTitle" className="text-foreground text-sm font-medium">
              {t("jobTitle")}
            </label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={t("jobTitlePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className="text-foreground text-sm font-medium">
              {t("location")}
            </label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("locationPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="timezone" className="text-foreground text-sm font-medium">
              {t("timezone")}
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
            >
              <option value="">{t("timezoneNotSet")}</option>
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="website" className="text-foreground text-sm font-medium">
              {t("website")}
            </label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={t("websitePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-foreground text-sm font-medium">
              {t("bio")}
            </label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("bioPlaceholder")}
              maxLength={500}
              rows={4}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={updateProfile.isPending} className="self-start">
            {updateProfile.isPending ? t("saving") : t("saveChanges")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// M8.5: read-only, grouped like issue-detail-panel.tsx's PropertyRow
// sidebar (label above value, no border per field) rather than one boxed
// field each — same "surface tiers + spacing, not more boxes" direction
// Signal & Structure already established.
function AccountInformationCard({ data }: { data: ProfileResponse }) {
  const t = useTranslations("profile");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("accountInformation")}</CardTitle>
        <CardDescription>{t("accountInformationDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PropertyRow label={t("email")}>
          <div className="flex flex-col gap-1">
            <p className="text-foreground text-sm">{data.email}</p>
            <p className="text-muted-foreground text-xs">{t("emailManagedSeparately")}</p>
            <VerificationStatus verified={!!data.emailVerified} />
          </div>
        </PropertyRow>

        {data.website && <WebsiteRow label={t("website")} website={data.website} />}

        <PropertyRow label={t("memberSince")}>
          <span className="text-foreground font-mono text-sm">
            {new Date(data.createdAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </PropertyRow>

        <PropertyRow label={t("lastLogin")}>
          <span className="text-foreground font-mono text-sm">
            {data.lastLoginAt
              ? new Date(data.lastLoginAt).toLocaleString("en-US")
              : t("never")}
          </span>
        </PropertyRow>
      </CardContent>
    </Card>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}

// Only rendered once profileSchema has already accepted `website` as a
// valid absolute URL (server-side, authoritative) — the try/catch below is
// defensive-only, not a real expected path, per "never link an
// unvalidated URL."
function WebsiteRow({ label, website }: { label: string; website: string }) {
  let hostname = website;
  try {
    hostname = new URL(website).hostname.replace(/^www\./, "");
  } catch {
    // Fall back to the raw stored value — should not happen given
    // server-side z.url() validation, but never crash the page over it.
  }

  return (
    <PropertyRow label={label}>
      <a
        href={website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent inline-flex items-center gap-1 text-sm hover:underline"
      >
        {hostname}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </PropertyRow>
  );
}

// M8.2: plain hardcoded English strings, matching this file's own
// pre-i18n convention for this one piece (see docs/session-log.md M8.2) —
// M8.5 relocates this into AccountInformationCard's Email row but does not
// change its behavior, strings, or logic at all.
const RESEND_COOLDOWN_SECONDS = 60;

function VerificationStatus({ verified }: { verified: boolean }) {
  const resend = useResendVerification();
  // A plain boolean flipped by a timer, not a `cooldownUntil > Date.now()`
  // comparison computed during render — the latter calls the impure
  // `Date.now()` while rendering, which this project's lint rules
  // (react-hooks/purity) reject. See VerificationBanner for the same
  // pattern with a live countdown instead of a plain flag.
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isCoolingDown) return;
    const timeout = setTimeout(
      () => setIsCoolingDown(false),
      RESEND_COOLDOWN_SECONDS * 1000,
    );
    return () => clearTimeout(timeout);
  }, [isCoolingDown]);

  if (verified) {
    return (
      <span className="text-foreground inline-flex items-center gap-1 text-xs font-medium">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Verified
      </span>
    );
  }

  async function handleResend() {
    setMessage(null);
    try {
      await resend.mutateAsync();
      setMessage("Verification email sent");
      setIsCoolingDown(true);
    } catch (err) {
      const isRateLimited = err instanceof ApiError && err.code === "rate_limited";
      setMessage(
        isRateLimited
          ? "Please wait before requesting another verification email"
          : "Failed to send verification email",
      );
      if (isRateLimited) setIsCoolingDown(true);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">Not verified</span>
        <Button
          type="button"
          variant="link"
          size="xs"
          className="h-auto p-0"
          onClick={handleResend}
          disabled={resend.isPending || isCoolingDown}
        >
          {resend.isPending ? "Sending..." : "Resend verification"}
        </Button>
      </div>
      {message && <p className="text-muted-foreground text-xs">{message}</p>}
    </div>
  );
}
