import { prisma } from "@/lib/prisma";

// The only place `prisma.workspace.*` is called from.
export const workspaceRepository = {
  // Single atomic write (Prisma's nested-create, not a manual
  // $transaction): a workspace is never valid without an Owner, so
  // creating one always creates its first WorkspaceMember row in the same
  // operation — there's no window where a workspace exists ownerless.
  createWithOwner(
    data: { name: string; slug: string; description?: string },
    ownerId: string,
  ) {
    return prisma.workspace.create({
      data: { ...data, members: { create: { userId: ownerId, role: "OWNER" } } },
    });
  },

  findById(id: string) {
    return prisma.workspace.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.workspace.findUnique({ where: { slug } });
  },

  update(id: string, data: { name?: string; slug?: string; description?: string }) {
    return prisma.workspace.update({ where: { id }, data });
  },

  // Cascades WorkspaceMember and Project rows (onDelete: Cascade in
  // schema.prisma) — callers don't need to delete those first.
  delete(id: string) {
    return prisma.workspace.delete({ where: { id } });
  },
};
