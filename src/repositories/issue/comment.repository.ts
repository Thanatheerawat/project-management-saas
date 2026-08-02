import { prisma } from "@/lib/prisma";

// The only place `prisma.comment.*` is called from.
export const commentRepository = {
  // Includes the related User so the create response has full author
  // details in one query, same reasoning as
  // workspaceMemberRepository.findManyByWorkspace's `include: { user: true }`.
  create(data: { issueId: string; authorId: string; body: string }) {
    return prisma.comment.create({
      data,
      include: { author: true },
    });
  },

  findById(id: string) {
    return prisma.comment.findUnique({ where: { id } });
  },

  // Oldest-first — a comment thread reads top-to-bottom in the order it
  // was written, unlike findManyByWorkspace's newest-first project list.
  findManyByIssue(issueId: string) {
    return prisma.comment.findMany({
      where: { issueId },
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });
  },

  update(id: string, data: { body: string }) {
    return prisma.comment.update({ where: { id }, data, include: { author: true } });
  },

  delete(id: string) {
    return prisma.comment.delete({ where: { id } });
  },
};
