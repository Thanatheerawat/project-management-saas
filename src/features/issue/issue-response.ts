import { toLabelResponse } from "@/features/issue/label-response";
import type { Issue, IssueLabel, Label } from "@/generated/prisma/client";

// Used by every issue route (list, create, detail, update) — same
// motivation as toProjectResponse: one shape, not four hand-picked ones.
// `key` isn't a stored field (see the Issue.number comment in
// schema.prisma) — it's computed here from the project's key + this
// issue's number, so callers must pass the project's key alongside the
// issue itself.
//
// `labels` is embedded directly (not a separate per-issue fetch) so the
// Kanban board can render from a single `GET .../issues` request — the
// repository always includes this relation (see issueRepository's
// WITH_LABELS), so every caller of this mapper already has it.
export function toIssueResponse(
  issue: Issue & { labels: (IssueLabel & { label: Label })[] },
  projectKey: string,
) {
  return {
    id: issue.id,
    projectId: issue.projectId,
    key: `${projectKey}-${issue.number}`,
    number: issue.number,
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    position: issue.position,
    assigneeId: issue.assigneeId,
    reporterId: issue.reporterId,
    labels: issue.labels.map((issueLabel) => toLabelResponse(issueLabel.label)),
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}
