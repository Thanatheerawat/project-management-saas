"use client";

import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// M6.5 responsive pass: this used to always render 3 separate text
// buttons, which — combined with the hamburger trigger, workspace
// switcher, and theme toggle already in the same top bar — collided at
// phone widths (the actions row is `shrink-0`, so it forced horizontal
// overflow instead of wrapping). Now it renders BOTH a `md:flex` row
// (unchanged desktop behavior) and a `md:hidden` single dropdown trigger
// covering the same destinations plus Admin (when applicable) — only one
// of the two is ever visible at a given width, via CSS, not JS, so
// there's no layout-shift flash on resize.
export function UserMenu({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const t = useTranslations("navigation");

  // `redirect: false` + a manual router.push (instead of signOut's default
  // hard browser redirect) so the sign-out toast — rendered by the global
  // <Toaster/> — survives to be seen instead of being wiped out by a full
  // document reload straight to "/".
  async function handleSignOut() {
    await signOut({ redirect: false });
    toast.success(t("signedOut"));
    router.push("/");
  }

  return (
    <>
      {/* Desktop: unchanged inline actions. "/workspaces" resolves
          0/1/many memberships the same way login does, so it's always a
          valid "back to the app" destination regardless of which
          workspace the user is in. */}
      <div className="hidden items-center gap-2 md:flex">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/workspaces">{t("workspace")}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile">{t("profile")}</Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          {t("signOut")}
        </Button>
      </div>

      {/* Mobile: one compact trigger, everything else moves into the menu. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label={t("accountMenu")}
          >
            <CircleUserRound className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="md:hidden">
          <DropdownMenuItem asChild>
            <Link href="/workspaces">{t("workspace")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile">{t("profile")}</Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">{t("admin")}</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
