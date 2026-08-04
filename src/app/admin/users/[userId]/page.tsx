import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AdminUserDetail } from "@/features/admin/components/admin-user-detail";
import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/auth/rbac";

export const metadata: Metadata = { title: "รายละเอียดผู้ใช้ — Orbit Admin" };

// Only page in this increment that needs `auth()` itself — the current
// caller's id (for the "isActive toggle when viewing yourself" rule) and
// SUPER_ADMIN status (for the role-selector gate) aren't part of the
// AdminUserDetailResponse the hook fetches, so they're read here and
// passed down as plain props, same shape as the layout's own role check.
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login"); // defensive — the layout already gates this

  const { userId } = await params;
  const isSuperAdmin = hasRole(session.user.role, "SUPER_ADMIN");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[{ label: "ผู้ใช้", href: "/admin/users" }, { label: "รายละเอียด" }]}
      />
      <AdminUserDetail
        userId={userId}
        currentUserId={session.user.id}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
