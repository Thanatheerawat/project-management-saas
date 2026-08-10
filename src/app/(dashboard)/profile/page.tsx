import type { Metadata } from "next";
import Link from "next/link";

import { ProfileForm } from "@/features/user/components/profile-form";

export const metadata: Metadata = { title: "โปรไฟล์ — Orbit" };

export default function ProfilePage() {
  return (
    <div className="flex max-w-lg flex-col gap-6">
      {/* Profile previously had no way back to the app besides the navbar
          — this explicit link makes it obvious Profile isn't a dead end. */}
      <Link
        href="/workspaces"
        className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
      >
        ← กลับไป Workspace
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-xl font-bold">โปรไฟล์</h1>
        <p className="text-muted-foreground text-sm">จัดการข้อมูลบัญชีของคุณ</p>
      </div>
      <div className="border-border bg-surface rounded-xl border p-6">
        <ProfileForm />
      </div>
    </div>
  );
}
