"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function UserMenu() {
  const router = useRouter();

  // `redirect: false` + a manual router.push (instead of signOut's default
  // hard browser redirect) so the sign-out toast — rendered by the global
  // <Toaster/> — survives to be seen instead of being wiped out by a full
  // document reload straight to "/".
  async function handleSignOut() {
    await signOut({ redirect: false });
    toast.success("ออกจากระบบแล้ว");
    router.push("/");
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/profile">โปรไฟล์</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        ออกจากระบบ
      </Button>
    </div>
  );
}
