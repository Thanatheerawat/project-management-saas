import type { PlatformRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// P1-2: shared field set for the two safe-by-default lookups below —
// every field an existing non-credential caller actually reads (see
// user.repository's callers: register's dup-check, forgot-password,
// verify-email, resend-verification, /api/users/me, workspace member
// invite, ProjectDetailPage's owner display), and nothing else.
// Deliberately excludes `passwordHash` (only two call sites ever need
// it — see findByEmailWithPasswordHash/findByIdWithPasswordHash below),
// `lockedUntil`/`failedLoginAttempts` (login-lockout state, only read
// by auth.config.ts, which uses the password-aware method instead), and
// `updatedAt` (no caller reads it through these methods).
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  isActive: true,
  jobTitle: true,
  bio: true,
  location: true,
  timezone: true,
  website: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

// The only place `prisma.user.*` is called from — Route Handlers and
// auth.config.ts call these functions instead of Prisma directly.
export const userRepository = {
  // P1-2: narrowed via SAFE_USER_SELECT so `passwordHash` is structurally
  // absent from the returned type, not just conventionally unused — see
  // findByEmailWithPasswordHash for the one caller (login) that actually
  // needs the hash.
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: SAFE_USER_SELECT });
  },

  // P1-2: same reasoning as findByEmail — see findByIdWithPasswordHash
  // for the one caller (change-password) that needs the hash.
  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
  },

  // Workspace invitation hardening: User.email has never been stored
  // normalized (register/login compare it exactly as typed — confirmed
  // by inspection before adding this, not changed here), so an admin
  // typing "John@Example.com" would otherwise fail to find an existing
  // "john@example.com" account via findByEmail's exact match, and the
  // invite route would incorrectly treat them as unregistered. Scoped to
  // this one targeted use — deliberately not a replacement for
  // findByEmail, and login/register are untouched. Uses findFirst (not
  // findUnique) because Prisma's case-insensitive `mode` filter isn't
  // expressible against a `@unique` field's exact-match lookup.
  findByEmailCaseInsensitive(email: string) {
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: SAFE_USER_SELECT,
    });
  },

  // P1-2: exists only for auth.config.ts's credentials authorize() —
  // the single login call site that must verify a submitted password
  // against the stored hash, and must also see isActive/lockedUntil to
  // enforce the existing deactivated/locked-account checks. No other
  // caller should ever reach for this method — see findByEmail above for
  // everything else.
  findByEmailWithPasswordHash(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isActive: true,
        passwordHash: true,
        lockedUntil: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });
  },

  // P1-2: exists only for /api/users/password's change-password flow —
  // the single other call site that needs the hash, to verify the
  // submitted current password and reject a no-op "change" to the same
  // password. No other caller should ever reach for this method.
  findByIdWithPasswordHash(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, passwordHash: true },
    });
  },

  create(data: { name: string; email: string; passwordHash: string }) {
    return prisma.user.create({ data });
  },

  // M8.5: explicit narrow param type is the second layer of defense (the
  // first is profileSchema stripping unknown keys) — even a looser caller
  // can never smuggle role/isActive/passwordHash/etc. through this method,
  // since those keys don't type-check against this signature at all.
  updateProfile(
    id: string,
    data: {
      name?: string;
      image?: string;
      jobTitle?: string | null;
      bio?: string | null;
      location?: string | null;
      timezone?: string | null;
      website?: string | null;
    },
  ) {
    return prisma.user.update({ where: { id }, data });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  recordLoginSuccess(id: string) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
  },

  async recordLoginFailure(id: string): Promise<void> {
    const user = await prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      await prisma.user.update({
        where: { id },
        data: { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
      });
    }
  },

  verifyEmail(id: string) {
    return prisma.user.update({ where: { id }, data: { emailVerified: new Date() } });
  },

  // --- Milestone 6: Admin Dashboard --------------------------------
  // Platform-wide (no per-workspace scope), unlike every method above —
  // this is the first repository access here that isn't "the current
  // user's own record." `emailQuery` is shared between the list and its
  // count so a paginated total always matches what the filtered list
  // itself returned.

  findManyForAdmin({
    skip,
    take,
    emailQuery,
  }: {
    skip: number;
    take: number;
    emailQuery?: string;
  }) {
    return prisma.user.findMany({
      where: emailQuery
        ? { email: { contains: emailQuery, mode: "insensitive" } }
        : undefined,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { workspaceMemberships: true } } },
    });
  },

  countAll(emailQuery?: string) {
    return prisma.user.count({
      where: emailQuery
        ? { email: { contains: emailQuery, mode: "insensitive" } }
        : undefined,
    });
  },

  // Includes every workspace this user belongs to (with their role in
  // each) for the admin user-detail page — a platform admin needs to see
  // "what is this person a member of," not just their own account fields.
  findByIdForAdmin(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { workspaceMemberships: { include: { workspace: true } } },
    });
  },

  updateRole(id: string, role: PlatformRole) {
    return prisma.user.update({ where: { id }, data: { role } });
  },

  updateActive(id: string, isActive: boolean) {
    return prisma.user.update({ where: { id }, data: { isActive } });
  },
};
