import { prisma } from "@/lib/prisma";

// Longer than PasswordResetToken's 1h or VerificationToken's 24h — an
// invitation depends on someone else noticing/acting on an email, which
// realistically takes longer than either self-service flow.
export const WORKSPACE_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// The only place `prisma.workspaceInvitation.*` is called from. Stores
// only a hash of the token (docs/security.md, A02) — same convention as
// PasswordResetToken/VerificationToken.
//
// `email` on every row here is always the trimmed+lowercased canonical
// form — normalized once, at the route, before it ever reaches this
// repository (never re-derived here) — see the invitations route's own
// comment. This is scoped to invitation identity only: User.email itself
// is stored exactly as the account owner typed it (unchanged, untouched
// by this hardening pass), which is exactly why findByEmailCaseInsensitive
// (user.repository.ts) exists as a separate, targeted lookup rather than
// this repository assuming User.email is already normalized.
//
// Concurrency: a hand-written migration (not expressible in the Prisma
// schema DSL — see the model's own schema.prisma comment) adds
// `UNIQUE ("workspaceId", "email") WHERE "acceptedAt" IS NULL`, so at
// most one pending invitation can ever exist for a given
// (workspaceId, normalizedEmail) — enforced by Postgres itself at INSERT
// time, not just by invalidatePendingForWorkspaceAndEmail's read-then-act
// below (which remains useful for the common non-concurrent case, but is
// no longer what actually guarantees the invariant under a genuine race).
export const workspaceInvitationRepository = {
  create(data: {
    workspaceId: string;
    inviterId: string;
    email: string;
    role: "MEMBER" | "ADMIN";
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.workspaceInvitation.create({ data });
  },

  // Used only when create() above loses a concurrent race against the
  // partial unique index (P2002) — lets the losing request converge on
  // the winner's already-persisted, already-emailed invitation instead of
  // erroring or sending a second email for a token that was never
  // actually saved.
  findPendingByWorkspaceAndEmail(workspaceId: string, email: string) {
    return prisma.workspaceInvitation.findFirst({
      where: { workspaceId, email, acceptedAt: null },
    });
  },

  // Only returns a still-pending, not-yet-expired invitation — callers
  // never need to re-check those conditions themselves. This is the
  // actual acceptance gate's read step; claim() below is what performs
  // the real single-use enforcement atomically.
  findValid(tokenHash: string) {
    return prisma.workspaceInvitation.findFirst({
      where: { tokenHash, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  // Raw, unfiltered lookup — used only to distinguish "expired"/"already
  // accepted"/"never existed" for a clearer error message, same
  // diagnostic-only pattern as passwordResetTokenRepository.findByTokenHash
  // and verificationTokenRepository.findByIdentifierAndToken. Never used
  // to authorize anything; the actual gate is findValid/claim.
  findByTokenHash(tokenHash: string) {
    return prisma.workspaceInvitation.findUnique({ where: { tokenHash } });
  },

  // The real single-use enforcement: an atomic conditional UPDATE
  // (`WHERE acceptedAt IS NULL`), not a separate read-then-write. Postgres
  // serializes concurrent UPDATEs against the same row (same reasoning
  // already established in this codebase for Project.issueCounter's
  // `{ increment: 1 }` — see docs/session-log.md's M6 CI investigation),
  // so of two simultaneous accept attempts for the same invitation, only
  // one can ever see `count === 1` here; the other correctly sees `0` and
  // must treat the invitation as already used. No $transaction needed —
  // this single UPDATE is already atomic on its own.
  async claim(id: string): Promise<boolean> {
    const result = await prisma.workspaceInvitation.updateMany({
      where: { id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    return result.count === 1;
  },

  // Invalidates any still-pending invite for this (workspace, email) pair
  // before a new one is minted — keeps exactly one live invitation per
  // recipient per workspace, same "invalidate old, mint one fresh"
  // pattern verificationTokenRepository.deleteAllForIdentifier uses for
  // resend-verification. deleteMany (not delete) so it's a no-op, not an
  // error, when there's nothing pending.
  invalidatePendingForWorkspaceAndEmail(workspaceId: string, email: string) {
    return prisma.workspaceInvitation.deleteMany({
      where: { workspaceId, email, acceptedAt: null },
    });
  },

  // Used to roll back a just-created invitation when sending its email
  // fails — same reasoning as resend-verification's token deletion on
  // send failure: an invitation nobody received is worse than none at
  // all (it can't be reused, but it silently occupies the "one pending
  // invite" slot invalidatePendingForWorkspaceAndEmail relies on).
  delete(id: string) {
    return prisma.workspaceInvitation.delete({ where: { id } });
  },
};
