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

  // M8.3: raw lookup with no usedAt/expiresAt filter — used only to
  // distinguish "expired" from "already used" from "never existed" for a
  // clearer reset-password error message. Never used to authorize
  // anything; the actual reset gate is still findValid alone. Same
  // "diagnostic-only, doesn't touch the real gate" pattern M8.2 added to
  // verificationTokenRepository.findByIdentifierAndToken.
  findByTokenHash(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({ where: { tokenHash } });
  },
};
