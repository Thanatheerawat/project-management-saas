import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span
            key={`${item.label}-${index}`}
            className="flex min-w-0 items-center gap-1.5"
          >
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground max-w-40 truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "max-w-40 truncate",
                  isLast ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="text-faint size-3.5 shrink-0" />}
          </span>
        );
      })}
    </nav>
  );
}
