import { prisma } from "@/lib/prisma";

export const passwordResetTokenRepository = {
  create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data });
  },

  // Only returns tokens that are unused and not yet expired — callers
  // never need to re-check those conditions themselves.
  findValid(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  markUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },
};
