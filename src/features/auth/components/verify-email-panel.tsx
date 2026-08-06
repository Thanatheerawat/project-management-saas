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
        <p className="text-foreground text-sm">ยืนยันอีเมลสำเร็จแล้ว</p>
        <Button asChild>
          <Link href="/profile">ไปที่โปรไฟล์</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="bg-muted text-foreground border-border rounded-md border px-3 py-2 text-xs font-medium">
        MOCK — ยังไม่มีระบบส่งอีเมลจริง ลิงก์นี้จำลองอีเมลที่ควรได้รับ
      </p>
      <p className="text-muted-foreground text-sm">
        กดยืนยันเพื่อจำลองการคลิกลิงก์ยืนยันจากอีเมล ({email})
      </p>
      {verifyEmail.isError && (
        <p className="text-destructive text-sm">ลิงก์นี้ใช้ไม่ได้หรือหมดอายุแล้ว</p>
      )}
      <Button
        onClick={() =>
          verifyEmail.mutate(
            { email, token },
            {
              onSuccess: () => toast.success("ยืนยันอีเมลแล้ว"),
              onError: () => toast.error("ยืนยันอีเมลไม่สำเร็จ"),
            },
          )
        }
        disabled={!email || !token || verifyEmail.isPending}
      >
        {verifyEmail.isPending ? "กำลังยืนยัน..." : "ยืนยันอีเมล"}
      </Button>
    </div>
  );
}
