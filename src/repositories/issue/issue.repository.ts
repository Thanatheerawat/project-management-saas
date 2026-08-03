import type { IssuePriority, IssueStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Every issue leaves this repository with its labels attached (Milestone
// 4 Increment 5B: embed labels in the Issue response so the Kanban board
// renders in a single request, no per-card label fetch) — reused across
// every method below so toIssueResponse's input type is consistent
// regardless of which one produced it, same "one shape per resource"
// discipline as the response mappers themselves.
const WITH_LABELS = { labels: { include: { label: true } } } as const;

// The only place `prisma.issue.*` is called from.
export const issueRepository = {
  // Wrapped in $transaction (not nested-create, unlike
  // workspaceRepository.createWithOwner — Issue isn't created alongside a
  // brand-new parent row, the Project already exists) so the
  // issueCounter increment and the Issue insert either both happen or
  // neither does. The increment itself is what's actually safe against
  // concurrent creates (Postgres's row-level `UPDATE x = x + 1` is
  // atomic); the transaction only protects against a crash between the
  // two statements leaving a permanently-skipped number, which is
  // harmless (see the Project.issueCounter comment in schema.prisma).
  create(data: {
    projectId: string;
    title: string;
    description?: string;
    priority?: IssuePriority;
    position: number;
    reporterId: string;
    assigneeId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id: data.projectId },
        data: { issueCounter: { increment: 1 } },
      });

      return tx.issue.create({
        data: { ...data, number: project.issueCounter },
        include: WITH_LABELS,
      });
    });
  },

  findById(id: string) {
    return prisma.issue.findUnique({ where: { id }, include: WITH_LABELS });
  },

  // Backs key-based lookup (e.g. resolving "ORB-123" -> an id) — the
  // display key isn't stored, so this is the query that makes it usable
  // as a lookup path (see the Issue.number comment in schema.prisma).
  findByProjectAndNumber(projectId: string, number: number) {
    return prisma.issue.findUnique({
      where: { projectId_number: { projectId, number } },
    });
  },

  // Backs position assignment on create: new issues are appended to the
  // end of their starting column instead of needing the client to supply
  // a position. `_max.position` is null when the column is empty.
  findMaxPositionInStatus(projectId: string, status: IssueStatus) {
    return prisma.issue.aggregate({
      where: { projectId, status },
      _max: { position: true },
    });
  },

  // Ordered by [status, position]: Postgres sorts an enum column by its
  // declaration order (schema.prisma lists IssueStatus
  // BACKLOG -> ... -> CANCELLED to match the Kanban board's left-to-right
  // column order), so this one query already returns issues grouped into
  // board columns in the right order, position ascending within each.
  findManyByProject(projectId: string) {
    return prisma.issue.findMany({
      where: { projectId },
      orderBy: [{ status: "asc" }, { position: "asc" }],
      include: WITH_LABELS,
    });
  },

  // `assigneeId` accepts `null` explicitly (unassign) as well as a value
  // (reassign) — omitting the key entirely (not present in the object)
  // leaves the current assignee untouched, same optional-vs-null
  // distinction updateIssueSchema encodes at the validation layer.
  update(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: IssueStatus;
      priority?: IssuePriority;
      position?: number;
      assigneeId?: string | null;
    },
  ) {
    return prisma.issue.update({ where: { id }, data, include: WITH_LABELS });
  },

  delete(id: string) {
    return prisma.issue.delete({ where: { id } });
  },

  // --- Milestone 5: Analytics --------------------------------------
  // Every method below is a single grouped aggregate query — Postgres
  // does the counting, not a full issue fetch reduced in TypeScript.
  // Callers (features/analytics) zero-fill statuses/priorities with no
  // rows in the result, since "0 issues in this status" is still
  // meaningful information for a chart, not something to omit.

  // Reuses Issue's existing @@index([projectId, status]).
  countByStatus(projectId: string) {
    return prisma.issue.groupBy({
      by: ["status"],
      where: { projectId },
      _count: true,
    });
  },

  countByPriority(projectId: string) {
    return prisma.issue.groupBy({
      by: ["priority"],
      where: { projectId },
      _count: true,
    });
  },

  // Scoped across every project in a workspace via the Project
  // relation, reusing Project's existing @@index([workspaceId]) — no
  // new index needed.
  countByStatusForWorkspace(workspaceId: string) {
    return prisma.issue.groupBy({
      by: ["status"],
      where: { project: { workspaceId } },
      _count: true,
    });
  },

  countByPriorityForWorkspace(workspaceId: string) {
    return prisma.issue.groupBy({
      by: ["priority"],
      where: { project: { workspaceId } },
      _count: true,
    });
  },

  // Backs the workload chart. Prisma's groupBy groups `assigneeId: null`
  // rows together as their own group — that group becomes the
  // "Unassigned" bucket in toWorkloadResponse, not a filtered-out value.
  countByAssigneeForWorkspace(workspaceId: string) {
    return prisma.issue.groupBy({
      by: ["assigneeId"],
      where: { project: { workspaceId } },
      _count: true,
    });
  },
};
