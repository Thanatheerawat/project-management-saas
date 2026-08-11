"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ISSUE_STATUS_COLOR, ISSUE_STATUS_LABEL } from "@/constants/issue";
import { useUpdateIssue } from "@/features/issue/hooks/use-update-issue";
import { ISSUE_STATUSES } from "@/features/issue/schemas/update-issue.schema";
import type { IssueStatus } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api-client";

// Instant-apply on change, no Save button — mirrors MemberList's role
// <select> exactly. This is the "status control (button/dropdown)"
// substitute for drag-and-drop named in Decision Point C (deferred), kept
// as its own component/control so it never shares a submit action with
// EditIssueForm's other fields (see that file's header comment).
export function IssueStatusSelect({
  issueId,
  projectId,
  currentStatus,
}: {
  issueId: string;
  projectId: string;
  currentStatus: IssueStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const updateIssue = useUpdateIssue(issueId, projectId);

  async function handleChange(status: IssueStatus) {
    setError(null);
    try {
      await updateIssue.mutateAsync({ status });
      toast.success(`Status changed to ${ISSUE_STATUS_LABEL[status]}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update status";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: ISSUE_STATUS_COLOR[currentStatus] }}
        />
        <select
          aria-label="Issue Status"
          value={currentStatus}
          onChange={(e) => handleChange(e.target.value as IssueStatus)}
          disabled={updateIssue.isPending}
          className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-7 rounded-lg border bg-transparent px-2 text-xs outline-none focus-visible:ring-[3px]"
        >
          {ISSUE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ISSUE_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
