"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentSection } from "@/features/issue/components/comment-section";
import { EditIssueForm } from "@/features/issue/components/edit-issue-form";
import { IssueLabelSection } from "@/features/issue/components/issue-label-section";
import { IssueStatusSelect } from "@/features/issue/components/issue-status-select";
import { useIssue } from "@/features/issue/hooks/use-issue";
import { useWorkspaceMembers } from "@/features/workspace/hooks/use-workspace-members";
import { getInitials } from "@/lib/utils";

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
//
// Increment 4 (M6.5) reflows this into a two-column layout (main content
// left, metadata sidebar right) without touching any mutation logic:
// EditIssueForm still saves title/description/priority/assignee together
// in one submit exactly as before (tests/e2e/issue-flow.spec.ts asserts
// this combined-save flow), so it stays intact in the left column: the
// sidebar's Priority/Assignee are a read-only "at a glance" view sourced
// from the same already-loaded `data`, not a second set of controls.
// Status and Labels *do* move into the sidebar as their real controls —
// they were already independent instant-apply sections before this
// increment (see IssueStatusSelect's and IssueLabelSection's own
// comments), so relocating them changes nothing about how they save.
export function IssueDetailPanel({
  issueId,
  projectId,
  workspaceId,
  currentUserId,
  canModerateComments,
  canManageLabels,
}: IssueDetailPanelProps) {
  const issue = useIssue(issueId);
  const members = useWorkspaceMembers(workspaceId);

  if (issue.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (issue.isError || !issue.data) {
    return <p className="text-destructive text-sm">โหลดข้อมูล Issue ไม่สำเร็จ</p>;
  }

  const data = issue.data;
  const assignee = data.assigneeId
    ? members.data?.find((member) => member.user.id === data.assigneeId)?.user
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground font-mono text-sm">{data.key}</span>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {data.title}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
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

        <aside className="flex min-w-0 flex-col gap-4 lg:col-span-1">
          <SidebarField label="สถานะ">
            <IssueStatusSelect
              issueId={issueId}
              projectId={projectId}
              currentStatus={data.status}
            />
          </SidebarField>

          <SidebarField label="Priority">
            {data.priority === "NONE" ? (
              <span className="text-muted-foreground text-sm">ไม่ระบุ</span>
            ) : (
              <Badge variant="outline">{data.priority}</Badge>
            )}
          </SidebarField>

          <SidebarField label="ผู้รับผิดชอบ">
            {assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  {assignee.image && <AvatarImage src={assignee.image} alt="" />}
                  <AvatarFallback className="text-[10px]">
                    {getInitials(assignee)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground text-sm">
                  {assignee.name ?? assignee.email}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">ไม่มอบหมาย</span>
            )}
          </SidebarField>

          <SidebarField label="Label">
            <IssueLabelSection
              issueId={issueId}
              projectId={projectId}
              workspaceId={workspaceId}
              canManageLabels={canManageLabels}
            />
          </SidebarField>

          <SidebarField label="สร้างเมื่อ">
            <span className="text-foreground text-sm">
              {new Date(data.createdAt).toLocaleString("th-TH")}
            </span>
          </SidebarField>

          <SidebarField label="อัปเดตล่าสุด">
            <span className="text-foreground text-sm">
              {new Date(data.updatedAt).toLocaleString("th-TH")}
            </span>
          </SidebarField>
        </aside>
      </div>
    </div>
  );
}

// Local to this panel — the label/value stack the sidebar repeats 6 times,
// same visual convention as AdminUserDetail's DetailRow (muted xs label
// above foreground sm value), not exported since nothing outside this
// file needs it.
function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-border flex flex-col gap-1.5 rounded-xl border p-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}
