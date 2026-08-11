import type { ProjectStatus } from "@/generated/prisma/client";

// Human-readable labels for ProjectStatus — mirrors constants/issue.ts's
// ISSUE_STATUS_LABEL/ISSUE_PRIORITY_LABEL. The enum values themselves
// (ACTIVE, ON_HOLD, ...) remain the wire/DB/data values and
// `<option value=...>` values everywhere; only what a user reads
// switches to these.
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};
