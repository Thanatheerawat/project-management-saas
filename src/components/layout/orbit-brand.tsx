import { Orbit } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

// Shared brand mark for the app shell (Navbar in layouts with no sidebar,
// the Sidebar header where one exists) — Phase 2 of the Signal & Structure
// redesign. `Orbit` (lucide-react) is a literal rings-around-a-point glyph,
// not a generic logo stand-in, and it's already a project dependency, so
// this adds zero new packages.
//
// `href` omitted (as in the admin shell, which has never linked its brand
// anywhere) renders a plain span instead of a Link — same visual result,
// no dead/no-op navigation. `showLabel={false}` (the Sidebar's collapsed
// rail) keeps just the icon, so the same component works icon-only or
// icon+wordmark without a second component to maintain.
export function OrbitBrand({
  href,
  label = "Orbit",
  showLabel = true,
  className,
}: {
  href?: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const classes = cn(
    "text-foreground flex items-center gap-1.5 text-sm font-bold",
    className,
  );
  const content = (
    <>
      <Orbit className="text-accent size-4 shrink-0" strokeWidth={1.75} />
      {showLabel && <span className="truncate">{label}</span>}
    </>
  );

  if (!href) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
