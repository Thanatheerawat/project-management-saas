"use client";

import { ChevronsLeft, ChevronsRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { useSidebarStore } from "@/components/layout/sidebar-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: SidebarNavItem[];
  activeHref?: string;
}

// Icon-only collapse (not a hidden drawer) — the UI/UX doc calls for this
// specifically so the Kanban board can reclaim horizontal space.
export function Sidebar({ items, activeHref }: SidebarProps) {
  const { collapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        "border-border bg-surface flex h-full flex-col border-r transition-[width] duration-150",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map(({ label, href, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-border border-t p-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label={collapsed ? "ขยาย sidebar" : "ย่อ sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <ChevronsLeft className="size-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
