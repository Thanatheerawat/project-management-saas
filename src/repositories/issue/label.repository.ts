import { prisma } from "@/lib/prisma";

// The only place `prisma.label.*` is called from.
export const labelRepository = {
  create(data: { workspaceId: string; name: string; color: string }) {
    return prisma.label.create({ data });
  },

  findById(id: string) {
    return prisma.label.findUnique({ where: { id } });
  },

  // Backs the pre-create/pre-rename uniqueness check, same check-then-act
  // shape as projectRepository.findByWorkspaceAndName.
  findByWorkspaceAndName(workspaceId: string, name: string) {
    return prisma.label.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
    });
  },

  findManyByWorkspace(workspaceId: string) {
    return prisma.label.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    });
  },

  update(id: string, data: { name?: string; color?: string }) {
    return prisma.label.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.label.delete({ where: { id } });
  },
};
