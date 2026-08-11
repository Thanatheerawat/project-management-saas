import { UserCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProfileForm } from "@/features/user/components/profile-form";

export const metadata: Metadata = { title: "Profile — Orbit" };

// M6.5 finalization: added the account-icon badge + ring-based card so
// this reads as a proper settings page rather than a bare form — same
// visual language as the auth card (accent-tinted ring, not a flat
// border), no change to the form itself or the "Profile" heading text/role.
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
      <div className="flex items-center gap-3">
        <div className="bg-accent/10 flex size-11 items-center justify-center rounded-full">
          <UserCircle className="text-accent size-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your account information</p>
        </div>
      </div>
      <div className="border-border bg-surface ring-accent/5 rounded-xl border p-6 shadow-sm ring-1">
        <ProfileForm />
      </div>
    </div>
  );
}
