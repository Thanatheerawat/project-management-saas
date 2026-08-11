"use client";

import { ChevronsLeft, ChevronsRight, type LucideIcon, Menu } from "lucide-react";
import Link from "next/link";

import { useSidebarStore } from "@/components/layout/sidebar-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

// Shared between the desktop nav list and the mobile drawer's — one
// source of truth for what a nav link looks like, only the collapse
// behavior (icon-only vs icon+label) differs between the two contexts.
function SidebarNavLinks({
  items,
  activeHref,
  collapsed,
  onNavigate,
}: {
  items: SidebarNavItem[];
  activeHref?: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-2">
      {items.map(({ label, href, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent/10 text-accent font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.5} />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

// Desktop (md and up): the existing icon-only collapse, unchanged — the
// UI/UX doc calls for this specifically so the Kanban board can reclaim
// horizontal space. Below `md`, this same component instead renders as a
// Sheet-based drawer (Milestone 6.5 Increment 2) — a phone-width viewport
// has no room for a permanently-docked sidebar at all, collapsed or not,
// so "hide it and open on demand" replaces "narrow it" rather than
// stacking both behaviors.
export function Sidebar({ items, activeHref }: SidebarProps) {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <>
      <aside
        className={cn(
          "border-border bg-surface hidden h-full flex-col border-r transition-[width] duration-150 md:flex",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <SidebarNavLinks items={items} activeHref={activeHref} collapsed={collapsed} />
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

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 max-w-[80vw] md:hidden">
          <SheetHeader>
            <SheetTitle>เมนูนำทาง</SheetTitle>
          </SheetHeader>
          <SidebarNavLinks
            items={items}
            activeHref={activeHref}
            collapsed={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

// Rendered inside the Navbar (only by layouts that actually mount a
// Sidebar — Navbar itself stays sidebar-agnostic), not inside Sidebar's
// own DOM position, since the trigger needs to sit in the top bar while
// Sidebar renders below/beside it. Shares mobileOpen via the store rather
// than prop-drilling across that layout boundary.
export function SidebarMobileTrigger() {
  const { setMobileOpen } = useSidebarStore();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="md:hidden"
      onClick={() => setMobileOpen(true)}
      aria-label="เปิดเมนูนำทาง"
    >
      <Menu className="size-4" />
    </Button>
  );
}
