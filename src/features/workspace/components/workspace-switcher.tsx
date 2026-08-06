import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// No "use client" needed — this is pure presentation (a styled Link),
// unlike UserMenu which needs it for signOut()'s onClick. Switching
// workspace happens by navigating back to the picker (/workspaces), not
// an inline dropdown — see the Increment 5 report for why: it reuses the
// picker page instead of introducing a new dropdown-menu UI primitive.
export function WorkspaceSwitcher({ name }: { name: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="min-w-0">
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
