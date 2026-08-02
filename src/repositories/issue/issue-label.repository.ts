import { prisma } from "@/lib/prisma";

// The only place `prisma.issueLabel.*` is called from. No response mapper
// for this model — the join row itself has no meaningful fields beyond
// the two ids (see the IssueLabel comment in schema.prisma), so callers
// map through `label` (toLabelResponse) instead of an IssueLabel shape.
export const issueLabelRepository = {
  attach(issueId: string, labelId: string) {
    return prisma.issueLabel.create({ data: { issueId, labelId } });
  },

  detach(issueId: string, labelId: string) {
    return prisma.issueLabel.delete({
      where: { issueId_labelId: { issueId, labelId } },
    });
  },

  // Backs the pre-attach "already attached?" check and the pre-detach
  // "is it actually attached?" check — same check-then-act shape as every
  // other uniqueness/existence check in this codebase.
  findByIssueAndLabel(issueId: string, labelId: string) {
    return prisma.issueLabel.findUnique({
      where: { issueId_labelId: { issueId, labelId } },
    });
  },

  // Includes the related Label so callers can render name/color directly,
  // one query instead of N — same reasoning as
  // workspaceMemberRepository.findManyByWorkspace's `include: { user: true }`.
  findManyByIssue(issueId: string) {
    return prisma.issueLabel.findMany({
      where: { issueId },
      include: { label: true },
    });
  },
};
