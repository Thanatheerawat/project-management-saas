import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

// First "label + big number" tile in the app — M5's dashboard went
// straight to charts, so there was no precedent to reuse. Built on the
// plain Card+CardContent composition (no CardHeader), same primitive
// every other panel in the app uses.
export function StatCard({ label, value, icon: Icon, className }: StatCardProps) {
  return (
    <Card size="sm" className={className}>
      <CardContent className="flex items-center gap-3">
        {Icon && (
          <Icon className="text-muted-foreground size-5 shrink-0" strokeWidth={1.5} />
        )}
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">{label}</span>
          <span className="text-foreground text-xl font-semibold">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
