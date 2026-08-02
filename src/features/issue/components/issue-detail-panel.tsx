"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentSection } from "@/features/issue/components/comment-section";
import { EditIssueForm } from "@/features/issue/components/edit-issue-form";
import { IssueLabelSection } from "@/features/issue/components/issue-label-section";
import { IssueStatusSelect } from "@/features/issue/components/issue-status-select";
import { useIssue } from "@/features/issue/hooks/use-issue";

interface IssueDetailPanelProps {
  issueId: string;
  projectId: string;
  workspaceId: string;
  currentUserId: string;
  canModerateComments: boolean;
  canManageLabels: boolean;
}

// Single client-side orchestrator for the whole detail page: fetches the
// issue once via useIssue (Increment 5A) and hands already-resolved
// initial values down to EditIssueForm as props, same "initialize from
// resolved data, no effect" discipline as ProfileFields/EditProjectForm —
// the only difference is the resolution happens via a client query here
// instead of a Server Component prop, since Increment 6 was scoped to
// reuse the existing hooks rather than build a parallel SSR read path.
export function IssueDetailPanel({
  issueId,
  projectId,
  workspaceId,
  currentUserId,
  canModerateComments,
  canManageLabels,
}: IssueDetailPanelProps) {
  const issue = useIssue(issueId);

  if (issue.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!issue.data) {
    return <p className="text-destructive text-sm">โหลดข้อมูล Issue ไม่สำเร็จ</p>;
  }

  const data = issue.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-sm">{data.key}</span>
          {data.priority !== "NONE" && <Badge variant="outline">{data.priority}</Badge>}
        </div>
        <h1 className="text-foreground text-xl font-bold">{data.title}</h1>
        <IssueStatusSelect
          issueId={issueId}
          projectId={projectId}
          currentStatus={data.status}
        />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-foreground text-sm font-semibold">Label</h2>
        <IssueLabelSection
          issueId={issueId}
          projectId={projectId}
          workspaceId={workspaceId}
          canManageLabels={canManageLabels}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-foreground text-sm font-semibold">แก้ไข Issue</h2>
        <EditIssueForm
          issueId={issueId}
          projectId={projectId}
          workspaceId={workspaceId}
          initialTitle={data.title}
          initialDescription={data.description ?? ""}
          initialPriority={data.priority}
          initialAssigneeId={data.assigneeId}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-foreground text-sm font-semibold">ความคิดเห็น</h2>
        <CommentSection
          issueId={issueId}
          currentUserId={currentUserId}
          canModerate={canModerateComments}
        />
      </section>
    </div>
  );
}
