"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateIssue } from "@/features/issue/hooks/use-update-issue";
import { ISSUE_PRIORITIES } from "@/features/issue/schemas/create-issue.schema";
import { updateIssueSchema } from "@/features/issue/schemas/update-issue.schema";
import { useWorkspaceMembers } from "@/features/workspace/hooks/use-workspace-members";
import { ApiError } from "@/lib/api-client";

interface EditIssueFormProps {
  issueId: string;
  projectId: string;
  workspaceId: string;
  initialTitle: string;
  initialDescription: string;
  initialPriority: (typeof ISSUE_PRIORITIES)[number];
  initialAssigneeId: string | null;
}

// Title/description/priority/assignee only — `status` is deliberately
// excluded here and lives entirely in IssueStatusSelect's own instant-apply
// control, so there's never two controls racing to edit the same field
// (see the Increment 6 write-up in docs/session-log.md). Every workspace
// MEMBER can use this form — Decision Point G — unlike EditProjectForm,
// which page-gates ADMIN+, there's no role check here at all.
export function EditIssueForm({
  issueId,
  projectId,
  workspaceId,
  initialTitle,
  initialDescription,
  initialPriority,
  initialAssigneeId,
}: EditIssueFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [priority, setPriority] =
    useState<(typeof ISSUE_PRIORITIES)[number]>(initialPriority);
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId ?? "");
  const [error, setError] = useState<string | null>(null);

  const members = useWorkspaceMembers(workspaceId);
  const updateIssue = useUpdateIssue(issueId, projectId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = updateIssueSchema.safeParse({
      title,
      description: description || undefined,
      priority,
      assigneeId: assigneeId || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      await updateIssue.mutateAsync(parsed.data);
      toast.success("บันทึก Issue แล้ว");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-issue-title" className="text-foreground text-sm font-medium">
          ชื่อ Issue
        </label>
        <Input
          id="edit-issue-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="edit-issue-description"
          className="text-foreground text-sm font-medium"
        >
          คำอธิบาย
        </label>
        <Textarea
          id="edit-issue-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="edit-issue-priority"
            className="text-foreground text-sm font-medium"
          >
            Priority
          </label>
          <select
            id="edit-issue-priority"
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as (typeof ISSUE_PRIORITIES)[number])
            }
            className="border-input dark:bg-input/30 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none"
          >
            {ISSUE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="edit-issue-assignee"
            className="text-foreground text-sm font-medium"
          >
            Assignee
          </label>
          <select
            id="edit-issue-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={members.isLoading}
            className="border-input dark:bg-input/30 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none"
          >
            <option value="">ไม่มอบหมาย</option>
            {members.data?.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name ?? member.user.email}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={updateIssue.isPending} className="self-start">
        {updateIssue.isPending ? "กำลังบันทึก..." : "บันทึก"}
      </Button>
    </form>
  );
}
