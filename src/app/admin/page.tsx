import type { Metadata } from "next";

import { AdminOverviewSection } from "@/features/admin/components/admin-overview-section";

export const metadata: Metadata = { title: "ภาพรวมระบบ — Orbit Admin" };

// Thin Server Component — data comes entirely from the Increment 5 hooks
// inside AdminOverviewSection, no repository call here (unlike most other
// pages in this app), per Increment 6's "UI layer only" scope.
export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight">ภาพรวมระบบ</h1>
      <AdminOverviewSection />
    </div>
  );
}
