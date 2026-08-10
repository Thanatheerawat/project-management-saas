"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { type ProfileResponse, useProfile } from "@/features/user/hooks/use-profile";
import { useUpdateProfile } from "@/features/user/hooks/use-update-profile";
import { profileSchema } from "@/features/user/schemas/profile.schema";
import { ApiError } from "@/lib/api-client";

export function ProfileForm() {
  const profile = useProfile();

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return <p className="text-destructive text-sm">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ</p>;
  }

  // A separate component so `name` initializes directly from the loaded
  // profile (no effect needed to sync it in after the fact — this only
  // ever mounts once profile.data exists).
  return <ProfileFields data={profile.data} />;
}

function ProfileFields({ data }: { data: ProfileResponse }) {
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(data.name ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = profileSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      await updateProfile.mutateAsync(parsed.data);
      toast.success("บันทึกโปรไฟล์แล้ว");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-sm">อีเมล</span>
        <p className="text-foreground text-sm">{data.email}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-foreground text-sm font-medium">
          ชื่อ
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={updateProfile.isPending} className="self-start">
        {updateProfile.isPending ? "กำลังบันทึก..." : "บันทึก"}
      </Button>
    </form>
  );
}
