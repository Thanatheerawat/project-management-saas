import { prisma } from "@/lib/prisma";

// M8.1's register route already hardcodes this same 24h value locally
// (src/app/api/auth/register/route.ts) — duplicated there rather than
// imported from here to avoid touching that unrelated route in M8.2.
// Exported from here because the new resend-verification route (M8.2)
// needs the *identical* value both to mint a new token and to derive a
// token's creation time for the cooldown check below (the
// VerificationToken model has no createdAt column — see the model comment
// in schema.prisma — so "created at" is recovered as `expires - TTL`,
// which only works if every writer uses the same TTL).
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// M8.2: minimum time between two verification emails for the same
// identifier. Deliberately small (not a security boundary on its own —
// the real protection is the hashed, single-use, 24h-expiring token) —
// this exists purely to stop someone mashing "resend" from generating a
// pile of live tokens or spamming the mock/real email provider.
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

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

  // M8.2: exact-match lookup with no expiry filter, unlike findValid —
  // used only to distinguish "this token existed but expired" from "this
  // token never existed / was already consumed" for a clearer verify-email
  // error message. Never used to authorize anything; the actual
  // verification gate is still findValid alone.
  findByIdentifierAndToken(identifier: string, tokenHash: string) {
    return prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token: tokenHash } },
    });
  },

  // M8.2: the most recently created token for an identifier, found via
  // greatest `expires` — valid only because every writer uses the same
  // VERIFICATION_TOKEN_TTL_MS, so a later `expires` always means a later
  // `createdAt`. Powers the resend cooldown check.
  findMostRecentByIdentifier(identifier: string) {
    return prisma.verificationToken.findFirst({
      where: { identifier },
      orderBy: { expires: "desc" },
    });
  },

  // M8.2: invalidate every outstanding token for an identifier before
  // minting a fresh one on resend — keeps exactly one live verification
  // token per email at a time instead of letting them pile up
  // unboundedly across repeated resends. deleteMany (not delete) so it's
  // a no-op, not an error, when there's nothing to remove.
  deleteAllForIdentifier(identifier: string) {
    return prisma.verificationToken.deleteMany({ where: { identifier } });
  },
};
