import type { ProjectStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// The only place `prisma.project.*` is called from.
export const projectRepository = {
  create(data: {
    workspaceId: string;
    name: string;
    description?: string;
    ownerId: string;
    key: string;
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

  // Same check-then-act shape as findByWorkspaceAndName, for the `key`
  // uniqueness check the create route runs before insert (Milestone 4
  // Increment 1 — this method exists now because Project.key is a
  // required column as of this migration; the create route's use of it
  // is minimal on purpose and revisited in a later Milestone 4 increment).
  findByWorkspaceAndKey(workspaceId: string, key: string) {
    return prisma.project.findUnique({
      where: { workspaceId_key: { workspaceId, key } },
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

  // Milestone 6: Admin Dashboard's system-overview stat card — a plain
  // platform-wide count, no workspace scope.
  countAll() {
    return prisma.project.count();
  },
};
