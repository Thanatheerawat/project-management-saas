import type { Metadata } from "next";
import Link from "next/link";

import { ChangePasswordForm } from "@/features/user/components/change-password-form";
import { ProfileForm } from "@/features/user/components/profile-form";
import { SecurityActivitySection } from "@/features/user/components/security-activity-section";

export const metadata: Metadata = { title: "Profile — Orbit" };

// M8.5: the old plain "Profile" icon+heading block (M6.5 finalization) is
// superseded by ProfileForm's own richer ProfileHeader (avatar, name, job
// title/location, email + verification glance) — keeping both would stack
// two headers. This page is now just the back-link shell + self-contained
// sections, same "own heading, no page-level wrapper" shape
// ChangePasswordForm (M8.4) already established.
export default function ProfilePage() {
  return (
    <div className="flex max-w-lg flex-col gap-6">
      {/* Profile previously had no way back to the app besides the navbar
          — this explicit link makes it obvious Profile isn't a dead end. */}
      <Link
        href="/workspaces"
        className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
      >
        ← Back to Workspace
      </Link>
      <ProfileForm />
      <ChangePasswordForm />
      <SecurityActivitySection />
    </div>
  );
}
