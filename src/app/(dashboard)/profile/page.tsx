import type { Metadata } from "next";

import { ProfileForm } from "@/features/user/components/profile-form";

export const metadata: Metadata = { title: "โปรไฟล์ — Orbit" };

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-xl font-bold">โปรไฟล์</h1>
      <ProfileForm />
    </div>
  );
}
