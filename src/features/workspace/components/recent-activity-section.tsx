import { Activity } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

// No workspace-scoped activity feed exists to show yet — the only
// activity-like data in the app (AuditLog) is platform-wide and
// admin-only (Milestone 6), not something a workspace Member can read.
// Per Increment 3's scope ("no backend changes"), this is a placeholder
// for a real feed a future increment can build, not a fake "no activity"
// message implying the feature already works today.
export function RecentActivitySection() {
  return (
    <EmptyState
      icon={Activity}
      title="ยังไม่มีกิจกรรมล่าสุด"
      description="กิจกรรมของทีมใน Workspace นี้จะแสดงที่นี่เมื่อพร้อมใช้งาน"
    />
  );
}
