import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// No "use client" needed — this is pure presentation (a styled Link),
// unlike UserMenu which needs it for signOut()'s onClick. Switching
// workspace happens by navigating back to the picker (/workspaces), not
// an inline dropdown — see the Increment 5 report for why: it reuses the
// picker page instead of introducing a new dropdown-menu UI primitive.
//
// M6.5 responsive pass: `shrink` (not just `min-w-0`) is required here —
// buttonVariants' base classes hard-code `shrink-0`, which otherwise wins
// even with `min-w-0` added (they're different utility groups, so
// tailwind-merge doesn't dedupe one against the other), leaving this
// button unable to shrink below its content width at all. Without an
// explicit override, a long workspace name never actually truncates at
// narrow widths — it just pushes into the theme toggle / account menu
// next to it instead, which is exactly the 320px overlap this fixes.
export function WorkspaceSwitcher({ name }: { name: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="min-w-0 shrink">
      <Link href="/workspaces" className="flex min-w-0 items-center gap-1.5">
        <span className="text-foreground min-w-0 truncate text-sm font-bold">{name}</span>
        <ChevronsUpDown
          className="text-muted-foreground size-3.5 shrink-0"
          strokeWidth={1.5}
        />
      </Link>
    </Button>
  );
}
