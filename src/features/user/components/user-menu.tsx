"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function UserMenu() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/profile">โปรไฟล์</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
        ออกจากระบบ
      </Button>
    </div>
  );
}
