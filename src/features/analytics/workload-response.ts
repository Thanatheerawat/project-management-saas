import type { User, WorkspaceMember } from "@/generated/prisma/client";

type AssigneeCount = { assigneeId: string | null; _count: number };
type MemberWithUser = WorkspaceMember & { user: User };
type WorkloadEntry = { userId: string | null; name: string; count: number };

// Joins the grouped issue-by-assignee counts against the full workspace
// member roster so every member appears exactly once — including ones
// with zero assigned issues, which would otherwise be silently absent
// from the grouped query result rather than reported as "0". The
// "Unassigned" bucket is appended only when at least one issue in the
// workspace actually has no assignee, never as a permanent zero-row.
// Falls back to email for display when a member has no `name` set, since
// an empty chart label would otherwise look broken.
export function toWorkloadResponse(
  assigneeCounts: AssigneeCount[],
  members: MemberWithUser[],
) {
  const countByUserId = new Map(
    assigneeCounts
      .filter((row) => row.assigneeId !== null)
      .map((row) => [row.assigneeId as string, row._count]),
  );

  const workload: WorkloadEntry[] = members.map((member) => ({
    userId: member.user.id,
    name: member.user.name ?? member.user.email,
    count: countByUserId.get(member.user.id) ?? 0,
  }));

  const unassignedCount =
    assigneeCounts.find((row) => row.assigneeId === null)?._count ?? 0;
  if (unassignedCount > 0) {
    workload.push({ userId: null, name: "Unassigned", count: unassignedCount });
  }

  return workload.sort((a, b) => b.count - a.count);
}
