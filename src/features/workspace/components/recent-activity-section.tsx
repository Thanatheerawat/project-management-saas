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
      title="No recent activity yet"
      description="Team activity in this workspace will appear here once available"
      className="border-border rounded-xl border border-dashed"
    />
  );
}
