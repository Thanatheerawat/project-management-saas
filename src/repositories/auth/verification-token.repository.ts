import { prisma } from "@/lib/prisma";

// Reuses Auth.js's VerificationToken table shape for our own mock
// email-verification flow — see the comment on that model in
// schema.prisma for why.
export const verificationTokenRepository = {
  create(identifier: string, tokenHash: string, expires: Date) {
    return prisma.verificationToken.create({
      data: { identifier, token: tokenHash, expires },
    });
  },

  async findValid(identifier: string, tokenHash: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token: tokenHash } },
    });
    if (!record || record.expires < new Date()) return null;
    return record;
  },

  delete(identifier: string, tokenHash: string) {
    return prisma.verificationToken.delete({
      where: { identifier_token: { identifier, token: tokenHash } },
    });
  },
};
