"use client";

import { ChevronsLeft, ChevronsRight, type LucideIcon, Menu, Orbit } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { OrbitBrand } from "@/components/layout/orbit-brand";
import { useSidebarStore } from "@/components/layout/sidebar-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
//
// Active state (Phase 2 — Signal & Structure): a 2px left accent rail,
// always present but transparent when inactive, so the active item never
// shifts layout relative to its neighbors. Paired with the existing soft
// bg-accent/10 fill rather than replacing it — a "control surface" rail
// indicator plus a quiet tint, not a filled pill.
//
// Collapsed icon-only items previously had zero accessible name (the
// label span didn't render at all, not just visually hidden) and no
// hover affordance beyond a bare icon — both fixed here with an explicit
// aria-label and the existing (until now unused) Tooltip primitive,
// scoped to only the collapsed case since an already-visible text label
// needs no tooltip repeating it.
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
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
      {items.map(({ label, href, icon: Icon }) => {
        const active = href === activeHref;
        const linkClasses = cn(
          "flex items-center gap-2 rounded-md border-l-2 py-1.5 pr-2 pl-[calc(--spacing(2)-2px)] text-sm transition-colors",
          active
            ? "border-accent bg-accent/10 text-accent font-medium"
            : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        );

        if (collapsed) {
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-label={label}
                  className={linkClasses}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link key={href} href={href} onClick={onNavigate} className={linkClasses}>
            <Icon className="size-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{label}</span>
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
  // `items[].label` is already translated by the caller
  // (WorkspaceSidebar) — this component only owns its own chrome.
  const t = useTranslations("navigation");
  const toggleLabel = collapsed ? t("expandSidebar") : t("collapseSidebar");

  return (
    <>
      <aside
        className={cn(
          "border-border bg-surface hidden h-full flex-col border-r transition-[width] duration-150 md:flex",
          collapsed ? "w-14" : "w-56",
        )}
      >
        {/* Phase 2: brand header, height-matched to the Navbar (h-14) so
            the two align as one continuous top edge across the shell.
            Gives the sidebar its own identity anchor independent of
            whichever layout mounts it, and something for the collapsed
            rail to show above the icon-only nav list instead of nothing. */}
        <div
          className={cn(
            "border-border flex h-14 shrink-0 items-center border-b",
            collapsed ? "justify-center px-0" : "px-3",
          )}
        >
          <OrbitBrand href="/workspaces" showLabel={!collapsed} />
        </div>
        <SidebarNavLinks items={items} activeHref={activeHref} collapsed={collapsed} />
        <div className="border-border border-t p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggle}
                aria-label={toggleLabel}
              >
                {collapsed ? (
                  <ChevronsRight className="size-4" />
                ) : (
                  <ChevronsLeft className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{toggleLabel}</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 max-w-[80vw] md:hidden">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Orbit className="text-accent size-4 shrink-0" strokeWidth={1.75} />
              <SheetTitle>{t("menuTitle")}</SheetTitle>
            </div>
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
  const t = useTranslations("navigation");

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="md:hidden"
      onClick={() => setMobileOpen(true)}
      aria-label={t("openMenu")}
    >
      <Menu className="size-4" />
    </Button>
  );
}
