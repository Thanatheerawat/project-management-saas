"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateIssue } from "@/features/issue/hooks/use-create-issue";
import {
  createIssueSchema,
  ISSUE_PRIORITIES,
} from "@/features/issue/schemas/create-issue.schema";
import { useWorkspaceMembers } from "@/features/workspace/hooks/use-workspace-members";
import { ApiError } from "@/lib/api-client";

// Controlled Dialog with a plain Button toggling `open` (same convention
// as MemberList's remove-confirm dialog) rather than DialogTrigger asChild
// — kept consistent with the one dialog pattern already in this codebase.
export function CreateIssueDialog({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof ISSUE_PRIORITIES)[number]>("NONE");
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const members = useWorkspaceMembers(workspaceId);
  const createIssue = useCreateIssue(projectId);

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("NONE");
    setAssigneeId("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = createIssueSchema.safeParse({
      title,
      description: description || undefined,
      priority,
      assigneeId: assigneeId || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      await createIssue.mutateAsync(parsed.data);
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "สร้าง Issue ไม่สำเร็จ");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Issue ใหม่
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>สร้าง Issue ใหม่</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="issue-title" className="text-foreground text-sm font-medium">
              ชื่อ Issue
            </label>
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="issue-description"
              className="text-foreground text-sm font-medium"
            >
              คำอธิบาย (ถ้ามี)
            </label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor="issue-priority"
                className="text-foreground text-sm font-medium"
              >
                Priority
              </label>
              <select
                id="issue-priority"
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
                htmlFor="issue-assignee"
                className="text-foreground text-sm font-medium"
              >
                Assignee
              </label>
              <select
                id="issue-assignee"
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
          <DialogFooter>
            <Button type="submit" disabled={createIssue.isPending}>
              {createIssue.isPending ? "กำลังสร้าง..." : "สร้าง Issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
