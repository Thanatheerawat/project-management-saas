"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ISSUE_PRIORITY_COLOR, ISSUE_PRIORITY_LABEL } from "@/constants/issue";
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
//
// Phase 4 (Signal & Structure): the audit's "card-in-card nesting" finding
// pointed at this exact panel — six independently bordered/rounded boxes
// stacked in the sidebar (one per field), sitting on a page canvas with no
// containing surface of its own. Fixed purely visually: the whole panel is
// now one raised surface (Card) instead of a bare page-canvas div, and the
// old per-field boxes are gone in favor of PropertyRow (label above value,
// no border) grouped under two SectionLabels ("Properties" / "Timestamps")
// separated by a single hairline divider — same "surface tiers + spacing +
// restrained dividers, not more boxes" direction Phase 1-3 already
// established. No prop, hook, or mutation call in this file changed.
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
      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-6">
          <Skeleton className="h-8 w-2/3" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="border-border-muted flex flex-col gap-4 border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (issue.isError || !issue.data) {
    return <p className="text-destructive text-sm">Failed to load issue</p>;
  }

  const data = issue.data;
  const assignee = data.assigneeId
    ? members.data?.find((member) => member.user.id === data.assigneeId)?.user
    : undefined;

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardContent className="flex flex-col gap-6">
        <div className="border-border-muted flex flex-col gap-1 border-b pb-6">
          <span className="text-muted-foreground font-mono text-sm">{data.key}</span>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            {data.title}
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            <EditIssueForm
              issueId={issueId}
              projectId={projectId}
              workspaceId={workspaceId}
              initialTitle={data.title}
              initialDescription={data.description ?? ""}
              initialPriority={data.priority}
              initialAssigneeId={data.assigneeId}
            />

            <div className="border-border-muted border-t pt-6">
              <SectionLabel>Comments</SectionLabel>
              <div className="mt-3">
                <CommentSection
                  issueId={issueId}
                  currentUserId={currentUserId}
                  canModerate={canModerateComments}
                />
              </div>
            </div>
          </div>

          {/* Secondary panel: grouped by section rather than one bordered
              box per field (the audit's "card-in-card" finding) — a single
              hairline divider between the two groups, none between
              individual rows within a group. */}
          <aside className="border-border-muted flex min-w-0 flex-col gap-5 border-t pt-6 lg:col-span-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <section className="flex flex-col gap-4">
              <SectionLabel>Properties</SectionLabel>

              <PropertyRow label="Status">
                <IssueStatusSelect
                  issueId={issueId}
                  projectId={projectId}
                  currentStatus={data.status}
                />
              </PropertyRow>

              <PropertyRow label="Priority">
                {data.priority === "NONE" ? (
                  <span className="text-muted-foreground text-sm">None</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ISSUE_PRIORITY_COLOR[data.priority] }}
                      aria-hidden="true"
                    />
                    <span style={{ color: ISSUE_PRIORITY_COLOR[data.priority] }}>
                      {ISSUE_PRIORITY_LABEL[data.priority]}
                    </span>
                  </span>
                )}
              </PropertyRow>

              <PropertyRow label="Assignee">
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
                  <span className="text-muted-foreground text-sm">Unassigned</span>
                )}
              </PropertyRow>

              <PropertyRow label="Labels">
                <IssueLabelSection
                  issueId={issueId}
                  projectId={projectId}
                  workspaceId={workspaceId}
                  canManageLabels={canManageLabels}
                />
              </PropertyRow>
            </section>

            <section className="border-border-muted flex flex-col gap-4 border-t pt-5">
              <SectionLabel>Timestamps</SectionLabel>

              <PropertyRow label="Created">
                <span className="text-foreground font-mono text-xs">
                  {new Date(data.createdAt).toLocaleString("en-US")}
                </span>
              </PropertyRow>

              <PropertyRow label="Updated">
                <span className="text-foreground font-mono text-xs">
                  {new Date(data.updatedAt).toLocaleString("en-US")}
                </span>
              </PropertyRow>
            </section>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

// Local to this panel. SectionLabel matches KanbanColumn's own status-label
// treatment (text-xs font-semibold tracking-wide uppercase) so the same
// "structured panel" vocabulary reads consistently between the board and
// the detail page. PropertyRow replaces the old SidebarField — label above
// value, no border/rounded/background of its own — so grouping now comes
// from SectionLabel + a hairline divider between the two sections, not
// from one bordered box per field.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h2>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}
