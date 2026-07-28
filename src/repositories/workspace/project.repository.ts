import type { ProjectStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// The only place `prisma.project.*` is called from.
export const projectRepository = {
  create(data: {
    workspaceId: string;
    name: string;
    description?: string;
    ownerId: string;
  }) {
    return prisma.project.create({ data });
  },

  findById(id: string) {
    return prisma.project.findUnique({ where: { id } });
  },

  // Backs the pre-create/pre-rename uniqueness check (mirrors
  // userRepository.findByEmail's check-then-act pattern from Milestone 2
  // rather than catching a Prisma P2002 error after the fact).
  findByWorkspaceAndName(workspaceId: string, name: string) {
    return prisma.project.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
    });
  },

  // Newest-first — a workspace's most recently created project is the one
  // most likely to be actively worked on.
  findManyByWorkspace(workspaceId: string) {
    return prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  },

  update(
    id: string,
    data: { name?: string; description?: string; status?: ProjectStatus },
  ) {
    return prisma.project.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.project.delete({ where: { id } });
  },
};
