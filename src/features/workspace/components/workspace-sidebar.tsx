"use client";

import { FolderKanban, LayoutDashboard, Settings, Users } from "lucide-react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";

// Needs "use client" for usePathname() — the only way to know which nav
// item is active. Projects/Members/Settings are always listed regardless
// of the caller's workspace role — each destination page enforces its own
// view-only-vs-editable split server-side (a Member sees read-only content
// there, not a 404), so hiding the nav item itself would just be redundant
// UI logic duplicating what the page already does correctly.
export function WorkspaceSidebar({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <Sidebar
      items={[
        { label: "แดชบอร์ด", href: `/w/${slug}`, icon: LayoutDashboard },
        { label: "โปรเจกต์", href: `/w/${slug}/projects`, icon: FolderKanban },
        { label: "สมาชิก", href: `/w/${slug}/members`, icon: Users },
        { label: "ตั้งค่า", href: `/w/${slug}/settings`, icon: Settings },
      ]}
      activeHref={pathname}
    />
  );
}
