import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

// Phase 5 (Signal & Structure): no longer its own elevated Card — a row of
// 4 individually-raised cards for what is really one dataset ("this
// workspace/platform at a glance") was exactly the audit's "collection of
// white cards" complaint. StatCard is now a plain cell; StatStrip below
// supplies the single shared raised surface both this and
// AdminOverviewSection's stat row mount their cells inside, with dividers
// between cells doing the grouping work instead of 4 separate
// ring/shadow/radius boxes. Same "grouping via dividers, not more boxes"
// direction Phase 4 already established for Issue Detail's sidebar.
export function StatCard({ label, value, icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
      {Icon && (
        <Icon className="text-muted-foreground size-5 shrink-0" strokeWidth={1.5} />
      )}
      <div className="flex flex-col">
        <span className="text-muted-foreground text-xs">{label}</span>
        {/* font-mono: every real usage passes a plain numeric metric
            (project/issue/member counts) — system-generated data, same
            treatment as KanbanColumn's issue count and Admin table
            counts. */}
        <span className="text-foreground font-mono text-xl font-semibold">{value}</span>
      </div>
    </div>
  );
}

// The shared raised surface for a row of StatCard cells — `[--card-spacing:0]`
// strips Card's own padding (each cell supplies its own via StatCard), and
// the grid's divide-x/divide-y draw the one hairline separator between
// cells that a viewer needs to read them as related, without wrapping each
// one in its own ring+shadow+radius. Deliberately jumps straight from 1
// column to 4 (no 2-column middle step, unlike the old grid): Tailwind's
// `divide-x`/`divide-y` add a border to every child after the first in DOM
// order, which is only ever visually correct when the grid is a single row
// or a single column — a 2-column wrap would put a stray leading border on
// the third cell (start of row 2) since it's still "after" cell 1 in
// source order. Skipping straight to 4-up avoids that for this always-
// exactly-4-cells row.
export function StatStrip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("[--card-spacing:0]", className)}>
      <div className="divide-border-muted grid grid-cols-1 divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {children}
      </div>
    </Card>
  );
}
