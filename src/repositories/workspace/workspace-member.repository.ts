import type { WorkspaceRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// The only place `prisma.workspaceMember.*` is called from.
export const workspaceMemberRepository = {
  create(data: { workspaceId: string; userId: string; role: WorkspaceRole }) {
    return prisma.workspaceMember.create({ data });
  },

  findById(id: string) {
    return prisma.workspaceMember.findUnique({ where: { id } });
  },

  findByWorkspaceAndUser(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  },

  // Includes the related Workspace so "list workspaces I belong to" (with
  // my role in each) is one query instead of N. Ordered oldest-first so a
  // user's first-ever workspace sorts first in a picker list.
  findManyForUser(userId: string) {
    return prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
  },

  // Includes the related User so callers can render "who" a member is
  // without a separate N+1 lookup per row.
  findManyByWorkspace(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
  },

  // Includes the related User for the same reason findManyByWorkspace
  // does — the role-change response returns the same shape as the list.
  updateRole(id: string, role: WorkspaceRole) {
    return prisma.workspaceMember.update({
      where: { id },
      data: { role },
      include: { user: true },
    });
  },

  delete(id: string) {
    return prisma.workspaceMember.delete({ where: { id } });
  },
};
